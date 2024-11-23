// src/modules/bills/services/validation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  private readonly openaiApiKey: string;
  private readonly openaiApiEndpoint: string = 'https://api.openai.com/v1';
  private readonly assistantId: string;

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.assistantId = this.configService.get<string>(
      'OPENAI_ASSISTANT_ID_VALIDATION',
    );

    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is not set.');
    }

    if (!this.assistantId) {
      throw new Error('OpenAI assistant ID is not set.');
    }
  }

  async validateInvoice(invoice: ProcessingInvoice): Promise<ValidationResult> {
    // Prepare the invoice data
    const invoiceData = this.buildInvoiceData(invoice);

    try {
      // Step 1: Create a new thread
      const threadId = await this.createThread();

      // Step 2: Add a message to the thread with the invoice data
      await this.addMessageToThread(threadId, invoiceData);

      // Step 3: Run the assistant on the thread
      const runId = await this.runAssistant(threadId);

      // Step 4: Monitor the run until completion
      await this.monitorRun(threadId, runId);

      // Step 5: Retrieve the assistant's response
      const assistantResponse = await this.getAssistantResponse(threadId);

      // Step 6: Parse the assistant's response into ValidationResult
      const validationResult = this.parseValidationResponse(assistantResponse);

      return validationResult;
    } catch (error) {
      this.logger.error(`OpenAI validation error: ${error.message}`);
      throw error;
    }
  }

  private buildInvoiceData(invoice: ProcessingInvoice): string {
    // Format addresses
    const formatAddress = (address: any): string => {
      if (!address) return '';
      const parts = [];
      if (address.streetAddress) parts.push(address.streetAddress);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.postalCode) parts.push(address.postalCode);
      return parts.join(', ');
    };

    // Construct the invoice data object
    const invoiceData = {
      invoice: {
        id: invoice.id,
        invoice_id: invoice.invoice_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        vendor_name: invoice.vendor_name,
        vendor_address: formatAddress(invoice.vendor_address),
        customer_name: invoice.customer_name,
        customer_id: invoice.customer_id,
        customer_address: formatAddress(invoice.customer_address),
        invoice_total: invoice.invoice_total,
        amount_due: invoice.amount_due,
        service_start_date: invoice.service_start_date,
        service_end_date: invoice.service_end_date,
        // Include other fields as necessary
      },
      line_items:
        invoice.line_items?.map((item) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          // Include other fields as necessary
        })) || [],
    };

    return JSON.stringify(invoiceData, null, 2);
  }

  private async createThread(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.openaiApiEndpoint}/threads`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
      const threadId = response.data.id;
      this.logger.debug(`Thread created with ID: ${threadId}`);
      return threadId;
    } catch (error) {
      throw new Error(
        `Failed to create thread: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  private async addMessageToThread(
    threadId: string,
    invoiceData: string,
  ): Promise<void> {
    const messageContent = `
Please process this bill.

**Invoice Data:**
${invoiceData}
`;

    try {
      await axios.post(
        `${this.openaiApiEndpoint}/threads/${threadId}/messages`,
        {
          role: 'user',
          content: messageContent,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
      this.logger.debug('Message added to thread.');
    } catch (error) {
      throw new Error(
        `Failed to add message to thread: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  private async runAssistant(threadId: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.openaiApiEndpoint}/threads/${threadId}/runs`,
        {
          assistant_id: this.assistantId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
      const runId = response.data.id;
      this.logger.debug(`Run initiated with ID: ${runId}`);
      return runId;
    } catch (error) {
      throw new Error(
        `Failed to create run: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  private async monitorRun(threadId: string, runId: string): Promise<void> {
    let status = 'running';

    while (
      status === 'queued' ||
      status === 'running' ||
      status === 'in_progress'
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await axios.get(
        `${this.openaiApiEndpoint}/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
      status = response.data.status;
      this.logger.debug(`Run status: ${status}`);
    }

    if (status === 'failed' || status === 'canceled') {
      throw new Error(`Assistant run failed with status: ${status}`);
    }

    // Log successful completion with the actual status
    this.logger.debug(`Run completed successfully with status: ${status}`);
  }

  private async getAssistantResponse(threadId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.openaiApiEndpoint}/threads/${threadId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );

      const messages: Message[] = response.data.data;

      const assistantMessages = messages.filter(
        (msg: Message) => msg.role === 'assistant',
      );

      if (assistantMessages.length === 0) {
        throw new Error('No assistant responses found.');
      }

      // Assuming the last assistant message is the one we need
      const assistantContent: ContentItem[] =
        assistantMessages[assistantMessages.length - 1].content;

      // Extract text content
      const assistantText = assistantContent
        .filter((contentItem: ContentItem) => contentItem.type === 'text')
        .map((contentItem: ContentItem) => contentItem.text.value)
        .join(' ');

      this.logger.debug('Assistant response:', assistantText);

      // Log the raw assistant response
      console.log('Raw Assistant Response:', assistantText);

      return assistantText;
    } catch (error) {
      throw new Error(
        `Failed to retrieve assistant response: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  private parseValidationResponse(responseText: string): ValidationResult {
    try {
      // Log the raw response for debugging
      this.logger.debug('Raw assistant response:', responseText);

      // Extract JSON from the assistant's response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not find JSON in the assistant's response.");
      }
      const jsonResponse = jsonMatch[0];

      const validationResult: ValidationResult = JSON.parse(jsonResponse);
      return validationResult;
    } catch (error) {
      this.logger.error('Failed to parse validation response from assistant.');
      throw new Error('Failed to parse validation response from assistant.');
    }
  }
}

// Define ContentItem and Message interfaces
interface ContentItem {
  type: string;
  text: {
    value: string;
    annotations: any[];
  };
  // Include other properties if necessary
}

interface Message {
  role: string;
  content: ContentItem[];
  // Include other properties if necessary
}

interface ValidationResult {
  status: 'Pass' | 'Fail';
  level: 1 | 2;
  errors?: string[];
  updatedData?: any;
}
