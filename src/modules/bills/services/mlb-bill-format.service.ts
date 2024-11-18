// src/modules/bills/services/mlb-bill-format.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class MLBBillFormatService {
  private readonly logger = new Logger(MLBBillFormatService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async formatMLBBillWithOpenAI(
    mlbDataset: Record<string, unknown>,
    assistantId: string,
  ): Promise<unknown> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          {
            role: 'user',
            content: `Format the following MLB dataset: ${JSON.stringify(
              mlbDataset,
            )}`,
          },
        ],
        max_tokens: 1500,
        user: assistantId,
      });
      return response;
    } catch (error) {
      this.logger.error(
        `Error during MLB dataset formatting with OpenAI: ${error.message}`,
      );
      throw error;
    }
  }
}

