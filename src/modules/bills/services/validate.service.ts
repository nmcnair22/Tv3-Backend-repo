// src/modules/bills/services/validate.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { ValidationResult } from '../interfaces/validation-result.interface';

import { BillGateway } from '../bill.gateway';
import { EventType } from '../entities/event-log.entity';
import { EventLogService } from './event-log.service';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  private readonly openaiApiKey: string;
  private readonly openaiApiEndpoint: string = 'https://api.openai.com/v1';
  private readonly assistantId: string;

  constructor(
    private configService: ConfigService,
    private readonly billGateway: BillGateway,
    private readonly eventLogService: EventLogService,
  ) {
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

  // Updated to accept jobId
  async validateInvoice(
    invoice: ProcessingInvoice,
    jobId: string,
  ): Promise<ValidationResult> {
    // Prepare the invoice data
    const invoiceData = this.buildInvoiceData(invoice);
    this.logger.debug('Full invoice data to OpenAI:\n' + invoiceData);

    try {
      // Notify that validation is starting
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationStarted',
        detail: 'Starting validation process with the assistant...',
      });
      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        'Validation started.',
      );

      // Step 1: Create a new thread
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationInProgress',
        detail: 'Creating thread for assistant interaction...',
      });
      const threadId = await this.createThread();

      // Step 2: Add a message to the thread with the invoice data
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationInProgress',
        detail: 'Sending invoice data to assistant...',
      });
      await this.addMessageToThread(threadId, invoiceData);

      // Step 3: Run the assistant on the thread
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationInProgress',
        detail: 'Running validation assistant...',
      });
      const runId = await this.runAssistant(threadId);

      // Step 4: Monitor the run until completion
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationInProgress',
        detail: 'Waiting for assistant response...',
      });
      await this.monitorRun(threadId, runId);

      // Step 5: Retrieve the assistant's response
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationInProgress',
        detail: 'Retrieving assistant’s validation response...',
      });
      const assistantResponse = await this.getAssistantResponse(threadId);

      // Step 6: Parse the assistant's response into ValidationResult
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationInProgress',
        detail: 'Parsing validation results...',
      });
      const validationResult = this.parseValidationResponse(assistantResponse);

      // Based on validation result, emit and log events
      if (validationResult.status === 'Fail') {
        this.billGateway.emitUpdate(jobId, {
          status: 'ValidationFailed',
          step: 'ValidationFailed',
          detail: 'Validation failed. Invoice flagged for audit.',
          errors: validationResult.errors,
        });
        await this.eventLogService.logEvent(
          jobId,
          EventType.WARNING,
          'Validation failed.',
          { errors: validationResult.errors },
        );
      } else {
        this.billGateway.emitUpdate(jobId, {
          status: 'ValidationPassed',
          step: 'ValidationPassed',
          level: validationResult.level,
          detail: 'Validation passed successfully.',
        });
        await this.eventLogService.logEvent(
          jobId,
          EventType.INFO,
          `Validation passed at level ${validationResult.level}.`,
        );
      }

      return validationResult;
    } catch (error) {
      this.logger.error(`OpenAI validation error: ${error.message}`);
      this.billGateway.emitError(jobId, `Validation error: ${error.message}`);
      await this.eventLogService.logEvent(
        jobId,
        EventType.ERROR,
        'Validation process encountered an error.',
        { error: error.message },
      );
      throw error;
    }
  }

  private buildInvoiceData(invoice: ProcessingInvoice): string {
    const formatAddress = (address: any): string => {
      if (!address) return '';
      const parts = [];
      if (address.streetAddress) parts.push(address.streetAddress);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.postalCode) parts.push(address.postalCode);
      return parts.join(', ');
    };

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
        invoice_total: invoice.invoice_total ?? null,
        amount_due: invoice.amount_due ?? null,
        service_start_date: invoice.service_start_date,
        service_end_date: invoice.service_end_date,
      },
      line_items:
        invoice.line_items?.map((item) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
        })) || [],
    };

    // Convert tables into a textual format
    let tablesText = '';
    if (invoice.tables && invoice.tables.length > 0) {
      tablesText += '\n\nExtracted Tables:\n';
      invoice.tables.forEach((table, tableIndex) => {
        tablesText += `\nTable ${tableIndex + 1}\n`;

        // We'll reconstruct the table rows
        // First, build a 2D array representing the rows and columns
        const tableMatrix: string[][] = Array.from(
          { length: table.row_count },
          () => Array(table.column_count).fill(''),
        );
        for (const cell of table.cells) {
          tableMatrix[cell.row_index][cell.column_index] = cell.content || '';
        }

        // Convert each row of the matrix into a line of text
        for (const row of tableMatrix) {
          // Join the columns with a tab or some spacing
          tablesText += row.join('\t') + '\n';
        }
      });
    }

    // We will send the invoice and line item data as JSON, then append the table data as text.
    return JSON.stringify(invoiceData, null, 2) + tablesText;
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
    this.logger.debug('Message content sent to OpenAI:', messageContent);
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

      const assistantContent: ContentItem[] =
        assistantMessages[assistantMessages.length - 1].content;

      const assistantText = assistantContent
        .filter((contentItem: ContentItem) => contentItem.type === 'text')
        .map((contentItem: ContentItem) => contentItem.text.value)
        .join(' ');

      this.logger.debug('Assistant response:', assistantText);
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
      this.logger.debug('Raw assistant response:', responseText);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not find JSON in the assistant's response.");
      }
      const jsonResponse = jsonMatch[0];

      const validationData = JSON.parse(jsonResponse);

      const validationResult: ValidationResult = {
        status:
          validationData.ValidationResult?.Level === 'Fail' ? 'Fail' : 'Pass',
        level:
          validationData.ValidationResult?.Level === 'Success_Level_2'
            ? 2
            : validationData.ValidationResult?.Level === 'Success_Level_1'
              ? 1
              : 0,
        errors: validationData.ValidationResult?.Errors || null,
        updatedData: validationData.updatedData || null,
        ProcessedData: validationData.ProcessedData || null,
        LineItems: validationData.LineItems || [],
        ValidationResult: validationData.ValidationResult || null,
      };

      return validationResult;
    } catch (error) {
      this.logger.error(
        'Failed to parse validation response from assistant.',
        error,
      );
      throw new Error('Failed to parse validation response from assistant.');
    }
  }
}

interface ContentItem {
  type: string;
  text: {
    value: string;
    annotations: any[];
  };
}

interface Message {
  role: string;
  content: ContentItem[];
}
