// src/modules/bills/services/rag-pinecone.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Represents the payload for a single chunk to be upserted.
 */
interface UpsertPayload {
  docId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];

  /**
   * Optional metadata you may want to store with this record.
   * E.g., { chunkType: 'serviceLocation', pageNumber: 12 } ...
   */
  metadata?: Record<string, any>;
}

@Injectable()
export class RagPineconeService {
  private readonly logger = new Logger(RagPineconeService.name);

  private pinecone: Pinecone;
  private indexName: string;

  constructor(private configService: ConfigService) {
    const pineconeApiKey = this.configService.get<string>('PINECONE_API_KEY');
    this.indexName =
      this.configService.get<string>('PINECONE_INDEX_NAME') ||
      'bills-analysis-index';

    if (!pineconeApiKey || !this.indexName) {
      throw new Error(
        'Missing Pinecone config: PINECONE_API_KEY or PINECONE_INDEX_NAME not set.',
      );
    }

    // Initialize Pinecone client
    this.logger.log(
      `Initializing Pinecone client with index='${this.indexName}'`,
    );

    this.pinecone = new Pinecone({
      apiKey: pineconeApiKey,
    });
  }

  /**
   * Upsert a single chunk vector into the existing Pinecone index
   */
  public async upsertVector(payload: UpsertPayload): Promise<void> {
    const { docId, chunkIndex, text, embedding, metadata } = payload;
    const vectorId = `${docId}-chunk-${chunkIndex}`;

    try {
      // Obtain reference to your existing Pinecone index
      const index = this.pinecone.index(this.indexName);

      this.logger.debug(
        `Upserting vectorId='${vectorId}' into index='${this.indexName}'`,
      );

      // Combine user-provided metadata with the base doc info
      const metaObj = {
        docId,
        chunkIndex,
        text,
        // Optionally spread any extra fields passed in 'metadata'
        ...(metadata || {}),
      };

      await index.upsert([
        {
          id: vectorId,
          values: embedding,
          metadata: metaObj,
        },
      ]);

      this.logger.debug(`Upsert succeeded for vectorId='${vectorId}'`);
    } catch (error) {
      this.logger.error(`Error upserting vector '${vectorId}':`, error);
      throw error;
    }
  }

  /**
   * Query topK matches from the index, optionally filtering by docId
   * @return list of matches: { id, score, metadata }
   */
  public async queryEmbedding(embedding: number[], docId: string, topK = 3) {
    try {
      const index = this.pinecone.index(this.indexName);

      this.logger.debug(
        `Querying index='${this.indexName}' for docId='${docId}' topK=${topK}`,
      );

      // Filter so we only get vectors from this doc
      const filter = { docId: { $eq: docId } };

      const result = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
        filter,
      });

      const matches = result.matches || [];
      this.logger.debug(`Query returned ${matches.length} matches`);
      return matches;
    } catch (error) {
      this.logger.error('Error querying Pinecone:', error);
      throw error;
    }
  }
}
