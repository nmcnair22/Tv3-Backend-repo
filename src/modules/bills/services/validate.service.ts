// src/modules/bills/services/validate.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class ValidateService {
  private readonly logger = new Logger(ValidateService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async validateWithOpenAI(
    analysisResult: Record<string, unknown>,
    assistantId: string,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          {
            role: 'user',
            content: `Please validate the following analysis result: ${JSON.stringify(
              analysisResult,
            )}`,
          },
        ],
        max_tokens: 1500,
        user: assistantId,
      });

      const validationResult = response.choices[0]?.message?.content;
      if (validationResult) {
        return JSON.parse(validationResult);
      } else {
        this.logger.error('No validation result returned from OpenAI.');
        throw new Error('Validation failed.');
      }
    } catch (error) {
      this.logger.error(`Error during OpenAI validation: ${error.message}`);
      throw error;
    }
  }
}
