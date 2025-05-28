// src/modules/bills/services/rag-openai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class RagOpenAiService {
  private logger = new Logger(RagOpenAiService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const openAiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.openai = new OpenAI({ apiKey: openAiKey });
  }

  /**
   * Generate an embedding for the provided text
   */
  async getEmbedding(text: string): Promise<number[]> {
    // If you have a new 128k embedding model, swap 'text-embedding-3-large' to that name.
    const embeddingModel =
      this.configService.get<string>('OPENAI_EMBED_MODEL') ||
      'text-embedding-3-large';

    const response = await this.openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Simple chat completion with retrieved context
   */
  async chatCompletion(userQuestion: string, context: string): Promise<string> {
    // Swap in GPT-4o, as you indicated it supports a 128K context window.
    // If you have environment-based overrides, you can still do that, but the fallback is 'gpt-4o'.
    const model =
      this.configService.get<string>('OPENAI_CHAT_MODEL') || 'gpt-4o';

    // Construct the prompt
    // Keep in mind you can still exceed 128k tokens if you try to pass a huge chunk of text.
    // Consider trimming/summarizing chunks as needed.
    this.logger.debug(`Using model '${model}' for chat completion.`);

    const resp = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant. Given some "context" from a document, answer the user's question. If you do not see the answer in the context, say so.\n\nContext: ${context}`,
        },
        {
          role: 'user',
          content: userQuestion,
        },
      ],
      // Even with a large context model, you may want to set a max_tokens limit:
      max_tokens: 8000, // example—change as you see fit
      temperature: 0.2,
    });

    const answer = resp.choices[0]?.message?.content || '';
    return answer;
  }
}
