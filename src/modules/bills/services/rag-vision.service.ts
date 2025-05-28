// src/modules/bills/services/rag-vision.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// For the new REST style client:
import DocumentIntelligence, {
    AnalyzeResultOperationOutput,
    getLongRunningPoller,
    isUnexpected,
} from '@azure-rest/ai-document-intelligence';

import * as fs from 'fs';
import OpenAI from 'openai';
import * as path from 'path';

@Injectable()
export class RagVisionService {
  private logger = new Logger(RagVisionService.name);

  private docIntelClient: ReturnType<typeof DocumentIntelligence>;
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    // Rename so it matches your analyze.service.ts usage
    const docEndpoint = this.configService.get<string>(
      'AZURE_FORM_RECOGNIZER_ENDPOINT',
    );
    const docKey = this.configService.get<string>('AZURE_FORM_RECOGNIZER_KEY');
    if (!docEndpoint || !docKey) {
      throw new Error(
        'AZURE_FORM_RECOGNIZER_ENDPOINT or AZURE_FORM_RECOGNIZER_KEY is not set.',
      );
    }

    this.docIntelClient = DocumentIntelligence(docEndpoint, { key: docKey });

    // 2) Setup OpenAI
    const openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openAiApiKey) {
      throw new Error('OPENAI_API_KEY is not set.');
    }
    this.openai = new OpenAI({ apiKey: openAiApiKey });
  }

  /**
   * Example function that processes the PDF using Layout, and then also does GPT-4 Vision
   */
  async processDocumentViaRagVision(filePath: string, docId: string) {
    this.logger.log(
      `processDocumentViaRagVision() docId=${docId}, filePath=${filePath}`,
    );

    // 1) Extract text from PDF via Layout model
    const markdownFromLayout = await this.extractLayoutAsMarkdown(filePath);

    // 2) Possibly convert PDF -> images, pass each to GPT-4 Vision
    const images = this.fakePdfToImages(filePath);
    let combinedVisionText = '';
    for (const imagePath of images) {
      const text = await this.gpt4VisionInference(imagePath);
      combinedVisionText += `\n---\n[Image: ${imagePath}]\n${text}`;
    }

    // 3) Combine both sets of text
    const finalContent = `## Layout Markdown\n${markdownFromLayout}\n\n## Vision Text\n${combinedVisionText}`;
    this.logger.debug(`Final combined content length: ${finalContent.length}`);

    // Return or store in Pinecone, etc.
    return finalContent;
  }

  private async extractLayoutAsMarkdown(filePath: string): Promise<string> {
    const fileData = fs.readFileSync(filePath);

    const initialResponse = await this.docIntelClient
      .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
      .post({
        contentType: 'application/pdf',
        body: fileData,
        queryParameters: { outputContentFormat: 'markdown' },
      });

    if (isUnexpected(initialResponse)) {
      this.logger.error(
        `Layout analyze call failed: ${JSON.stringify(initialResponse.body.error)}`,
      );
      return '';
    }

    const poller = await getLongRunningPoller(
      this.docIntelClient,
      initialResponse,
    );
    const pollResult = await poller.pollUntilDone();
    if (isUnexpected(pollResult)) {
      this.logger.error(
        `Layout poll result failed: ${JSON.stringify(pollResult.body.error)}`,
      );
      return '';
    }

    const result = pollResult.body as AnalyzeResultOperationOutput;
    const analyzeRes = result.analyzeResult;
    if (!analyzeRes) {
      this.logger.warn('No analyzeResult from layout model');
      return '';
    }

    return analyzeRes.content || '';
  }

  private fakePdfToImages(filePath: string): string[] {
    const baseName = path.basename(filePath, path.extname(filePath));
    return [`${baseName}_page1.png`, `${baseName}_page2.png`];
  }

  private async gpt4VisionInference(imagePath: string): Promise<string> {
    this.logger.log(`gpt4VisionInference: image=${imagePath}`);
    let base64Str = '';
    try {
      const imgBuf = fs.readFileSync(imagePath);
      base64Str = imgBuf.toString('base64');
    } catch (e) {
      this.logger.warn(`Cannot read image file: ${imagePath}`);
      // fallback
    }

    // hypothetical
    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4o', // or some model name that supports vision
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image in detail:' },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Str}` },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const answer = resp.choices[0]?.message?.content || '';
    return answer;
  }
}
