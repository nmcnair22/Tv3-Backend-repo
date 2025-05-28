// src/modules/bills/services/rag.service.ts

import DocumentIntelligence, {
  AnalyzeResultOperationOutput,
  getLongRunningPoller,
  isUnexpected,
} from '@azure-rest/ai-document-intelligence';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

import { RagOpenAiService } from './rag-openai.service';
import { RagPineconeService } from './rag-pinecone.service';

interface TableSpan {
  offset: number;
  length: number;
}

interface TableBoundingRegion {
  pageNumber: number;
  polygon: number[]; // 8 points for bounding box
}

interface TableInfo {
  idx: number;
  minOffset: number;
  maxOffset: number;
  pageNumber: number;
  rowCount: number;
  columnCount: number;
}

@Injectable()
export class RagService {
  private logger = new Logger(RagService.name);
  private layoutClient; // the DocumentIntelligence "client"

  constructor(
    private configService: ConfigService,
    private openAiService: RagOpenAiService,
    private pineconeService: RagPineconeService,
  ) {
    // Initialize layout client
    const layoutEndpoint = this.configService.get<string>(
      'AZURE_FORM_RECOGNIZER_ENDPOINT',
    );
    const layoutKey = this.configService.get<string>(
      'AZURE_FORM_RECOGNIZER_KEY',
    );

    if (!layoutEndpoint || !layoutKey) {
      throw new Error(
        'AZURE_FORM_RECOGNIZER_ENDPOINT or AZURE_FORM_RECOGNIZER_KEY not set.',
      );
    }

    this.layoutClient = DocumentIntelligence(layoutEndpoint, {
      key: layoutKey,
    });
  }

  /**
   * Main RAG pipeline:
   *  1) Extract text in markdown from "prebuilt-layout"
   *  2) Merge cross-page tables (optional)
   *  3) Structure-aware chunking
   *  4) Embed + upsert to Pinecone
   */
  async processBillForRag(filePath: string, docId: string, useVision: boolean) {
    this.logger.log(
      `RAG process for docId=${docId}, file=${filePath}, useVision=${useVision}`,
    );

    // 1) Extract raw text in Markdown
    const { content, analyzeRes } =
      await this.extractLayoutAsMarkdown(filePath);
    if (!content) {
      this.logger.warn('No text extracted from layout. Possibly an empty doc?');
      return;
    }

    // 2) Merge cross-page tables if needed
    let optimizedContent = content;
    if (analyzeRes?.tables && analyzeRes.tables.length > 1) {
      optimizedContent = this.mergeCrossPageTables(analyzeRes);
    }

    // 3) If you want GPT-4 Vision, you might do an additional step here.

    // 4) Structure-aware chunking. Example: detect "Service Location" lines
    //    If none found, fallback to naive chunking.
    const chunks = this.structureAwareChunking(optimizedContent);

    // 5) For each chunk, embed & upsert to Pinecone
    let chunkIndex = 0;
    for (const chunkObj of chunks) {
      const embedding = await this.openAiService.getEmbedding(chunkObj.text);

      // Combine chunk metadata with docId
      const metadata = {
        docId,
        chunkIndex,
        chunkType: chunkObj.metadata.chunkType,
        text: chunkObj.text,
      };

      await this.pineconeService.upsertVector({
        docId,
        chunkIndex,
        text: chunkObj.text,
        embedding,
        metadata,
      });

      chunkIndex++;
    }

    this.logger.log(
      `RAG pipeline done. Chunks stored in Pinecone: ${chunkIndex}`,
    );
  }

  /**
   * askQuestion: retrieve from Pinecone, pass context to OpenAI
   */
  async askQuestion(docId: string, userQuestion: string): Promise<string> {
    this.logger.log(`askQuestion(docId=${docId}): ${userQuestion}`);

    // 1) embed user question
    const questionEmbedding =
      await this.openAiService.getEmbedding(userQuestion);

    // 2) Increase topK to capture more chunks
    //    Example: ask for 50 or 95 if you want to gather more pages
    //    or pass it as a parameter from the controller if needed.
    const topK = 50; // <--- Adjust as you like, 50 or 95, etc.

    const matches = await this.pineconeService.queryEmbedding(
      questionEmbedding,
      docId,
      topK,
    );

    if (!matches.length) {
      return `No relevant chunks found for docId=${docId}.`;
    }

    // 3) build context
    let context = '';
    for (const match of matches) {
      context += `\n[Chunk#${match.metadata.chunkIndex}]: ${match.metadata.text}`;
    }

    // 4) pass to chat
    const answer = await this.openAiService.chatCompletion(
      userQuestion,
      context,
    );
    return answer;
  }

  /**
   * Extract text from layout model with "markdown" output
   */
  private async extractLayoutAsMarkdown(filePath: string): Promise<{
    content: string;
    analyzeRes: AnalyzeResultOperationOutput['analyzeResult'] | undefined;
  }> {
    const fileData = fs.readFileSync(filePath);

    const initialResponse = await this.layoutClient
      .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
      .post({
        contentType: 'application/pdf',
        body: fileData,
        queryParameters: {
          outputContentFormat: 'markdown',
        },
      });

    if (isUnexpected(initialResponse)) {
      this.logger.error(
        `Layout analyze call failed: ${JSON.stringify(initialResponse.body.error)}`,
      );
      return { content: '', analyzeRes: undefined };
    }

    const poller = await getLongRunningPoller(
      this.layoutClient,
      initialResponse,
    );
    const pollResult = await poller.pollUntilDone();
    if (isUnexpected(pollResult)) {
      this.logger.error(
        `Layout poll result failed: ${JSON.stringify(pollResult.body.error)}`,
      );
      return { content: '', analyzeRes: undefined };
    }

    const result = pollResult.body as AnalyzeResultOperationOutput;
    const analyzeRes = result.analyzeResult;
    if (!analyzeRes) {
      this.logger.warn('No analyzeResult from layout model');
      return { content: '', analyzeRes: undefined };
    }

    return {
      content: analyzeRes.content || '',
      analyzeRes,
    };
  }

  /**
   * Attempt to merge multi-page tables in the raw markdown
   */
  private mergeCrossPageTables(
    analyzeRes: AnalyzeResultOperationOutput['analyzeResult'],
  ): string {
    const content = analyzeRes?.content || '';
    const tables = analyzeRes?.tables || [];
    if (tables.length < 2) {
      return content;
    }

    // gather offset info
    const tableList: TableInfo[] = [];
    tables.forEach((tbl, idx) => {
      const spans = tbl.spans || [];
      if (!spans.length) return;
      const minOff = Math.min(...spans.map((s) => s.offset));
      const maxOff = Math.max(...spans.map((s) => s.offset + s.length));
      const pages = (tbl.boundingRegions || []).map((r) => r.pageNumber);
      const pageNumber = pages.length ? Math.min(...pages) : 1;

      tableList.push({
        idx,
        minOffset: minOff,
        maxOffset: maxOff,
        pageNumber,
        rowCount: tbl.rowCount,
        columnCount: tbl.columnCount,
      });
    });

    // sort by minOffset
    tableList.sort((a, b) => a.minOffset - b.minOffset);

    interface Merged {
      tableIdxList: number[];
      offset: { min: number; max: number };
      content: string;
    }
    const mergedArray: Merged[] = [];

    for (let i = 0; i < tableList.length - 1; i++) {
      const curr = tableList[i];
      const next = tableList[i + 1];

      // if next is exactly next page, same column count => attempt vertical merge
      if (
        next.pageNumber === curr.pageNumber + 1 &&
        curr.columnCount === next.columnCount
      ) {
        this.logger.debug(`Merging table #${curr.idx} with #${next.idx}`);

        const preContent = content.slice(curr.minOffset, curr.maxOffset);
        const curContent = content.slice(next.minOffset, next.maxOffset);

        // do a vertical merge
        const mergedTable = this.mergeVerticalTables(preContent, curContent);
        mergedArray.push({
          tableIdxList: [curr.idx, next.idx],
          offset: { min: curr.minOffset, max: next.maxOffset },
          content: mergedTable,
        });
        // skip the next table
        i++;
      }
    }

    if (!mergedArray.length) {
      return content;
    }

    let finalStr = '';
    let cursor = 0;
    for (const m of mergedArray) {
      finalStr += content.slice(cursor, m.offset.min);
      finalStr += m.content;
      cursor = m.offset.max;
    }
    // leftover
    finalStr += content.slice(cursor);

    return finalStr;
  }

  /**
   * Merge two table markdown blocks in a vertical manner
   */
  private mergeVerticalTables(table1: string, table2: string): string {
    const table2NoHeader = this.removeTableHeader(table2);
    return table1.trimEnd() + '\n' + table2NoHeader.trimStart();
  }

  /**
   * Example: remove the repeated markdown row of "|--|--|--|" if found
   */
  private removeTableHeader(mdTable: string): string {
    const lines = mdTable.split('\n');
    const filtered: string[] = [];
    for (const line of lines) {
      // This is a naive approach:
      if (line.match(/^\|[\s-]+\|[\s-]+\|/)) {
        // skip
        continue;
      }
      filtered.push(line);
    }
    return filtered.join('\n');
  }

  /**
   * Example structure-aware chunking:
   *  - if we see "Service Location X of Y"
   *  - otherwise do naive substring chunk
   */
  private structureAwareChunking(
    fullText: string,
  ): { text: string; metadata: any }[] {
    const serviceRegex = /(Service\s+Location\s+\d+\s+of\s+\d+)/gi;
    const matches = [...fullText.matchAll(serviceRegex)];

    if (!matches.length) {
      // fallback
      return this.naiveChunks(fullText, 2000);
    }

    const chunks: { text: string; metadata: any }[] = [];
    let lastIndex = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const start = match.index || 0;

      // text up to this location
      if (start > lastIndex) {
        const chunk1 = fullText.slice(lastIndex, start);
        if (chunk1.trim()) {
          chunks.push({ text: chunk1, metadata: { chunkType: 'general' } });
        }
      }

      // text from this location to next or end
      const nextMatchIndex =
        i < matches.length - 1
          ? (matches[i + 1].index ?? fullText.length)
          : fullText.length;
      const locationText = fullText.slice(start, nextMatchIndex);
      chunks.push({
        text: locationText,
        metadata: { chunkType: 'serviceLocation' },
      });

      lastIndex = nextMatchIndex;
    }

    return chunks;
  }

  /**
   * fallback naive chunk approach
   */
  private naiveChunks(fullText: string, chunkSize = 2000) {
    const results: { text: string; metadata: any }[] = [];
    let start = 0;
    while (start < fullText.length) {
      const end = start + chunkSize;
      results.push({
        text: fullText.substring(start, end),
        metadata: { chunkType: 'naive' },
      });
      start = end;
    }
    return results;
  }
}
