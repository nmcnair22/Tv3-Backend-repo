// src/modules/bills/bills.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as mysql from 'mysql2/promise';
import * as path from 'path';
import { Repository } from 'typeorm';
import { AzureBill } from './entities/azure-bill.entity';
import { AzureInvoiceItem } from './entities/azure-invoice-item.entity';
import { AccountData } from './interfaces/account-data.interface';
import { TemMasterViewRow } from './interfaces/tem-master-view-row.interface';
import { AnalyzeService } from './services/analyze.service';
import { ArchiveService } from './services/archive.service';
import { MLBBillFormatService } from './services/mlb-bill-format.service';
import { ValidateService } from './services/validate.service';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);
  private temPool: mysql.Pool;
  private isProcessing = false;

  constructor(
    private readonly analyzeService: AnalyzeService,
    private readonly validateService: ValidateService,
    private readonly mlbBillFormatService: MLBBillFormatService,
    private readonly archiveService: ArchiveService,
    private readonly configService: ConfigService,
    @InjectRepository(AzureBill)
    private readonly azureBillRepository: Repository<AzureBill>,
    @InjectRepository(AzureInvoiceItem)
    private readonly azureInvoiceItemRepository: Repository<AzureInvoiceItem>,
  ) {
    this.temPool = mysql.createPool({
      host: this.configService.get<string>('TEM_DB_HOST'),
      user: this.configService.get<string>('TEM_DB_USER'),
      password: this.configService.get<string>('TEM_DB_PASSWORD'),
      database: this.configService.get<string>('TEM_DB_NAME'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  /**
   * Analyzes a bill by processing the uploaded file.
   * @param filePath - The path to the uploaded file.
   * @returns An object containing the analysis result.
   */
  async analyzeBill(filePath: string) {
    if (this.isProcessing) {
      this.logger.warn(
        'Attempted to start a new analysis while another process is running.',
      );
      throw new Error('Another analysis process is already running.');
    }

    if (!filePath) {
      this.logger.warn('No file path provided.');
      throw new Error('No file path provided');
    }

    this.isProcessing = true;

    try {
      this.logger.log(`Starting analysis for file: ${filePath}`);

      // Perform Azure Document Intelligence analysis
      const azureResult = await this.analyzeService.analyzeWithAzure(filePath);
      this.logger.log('Azure Document Intelligence analysis complete.');

      let { CustomerId } = azureResult;

      if (CustomerId) {
        // Clean up CustomerId by removing spaces and hyphens
        CustomerId = CustomerId.replace(/\s|-/g, '');
      }

      // Lookup account data based on CustomerId
      const accountData = await this.lookupAccount(CustomerId);

      if (!accountData) {
        this.logger.log(
          'New Account Detected. Processing as SLB for now.',
        );

        // Validate the bill using OpenAI
        const validationResult = await this.validateService.validateWithOpenAI(
          azureResult as unknown as Record<string, unknown>,
          this.configService.get<string>('OPENAI_ASSISTANT_ID_VALIDATION'),
        );

        return {
          message:
            'Processing complete for new account. Please flag the bill as MLB or SLB.',
          billType: 'new',
          fieldValues: azureResult,
          validationResult,
          renamedFileName: this.getFilenameFromPath(filePath),
        };
      }

      if (accountData.multipleLocations === 1) {
        this.logger.log(
          `Multi-location account detected for account: ${CustomerId}. Proceeding with MLB pipeline.`,
        );

        // Perform layout analysis using Azure Layout Model
        const mlbLayoutResult = await this.analyzeService.analyzeWithAzureLayoutModel();

        // Format MLB bill using OpenAI
        const mlbResult = await this.mlbBillFormatService.formatMLBBillWithOpenAI(
          { markdown: mlbLayoutResult },
          this.configService.get<string>(
            'OPENAI_ASSISTANT_ID_CONSOLIDATED',
          ),
        );

        return {
          message: 'MLB Processing complete',
          billType: 'MLB',
          mlbResult,
          renamedFileName: this.getFilenameFromPath(filePath),
        };
      }

      this.logger.log(
        `Single-location account detected for account: ${CustomerId}. Proceeding with SLB pipeline.`,
      );

      // Validate the bill using OpenAI
      const validationResult = await this.validateService.validateWithOpenAI(
        azureResult as unknown as Record<string, unknown>,
        this.configService.get<string>('OPENAI_ASSISTANT_ID_VALIDATION'),
      );

      return {
        message: 'SLB Processing complete',
        billType: 'single',
        fieldValues: azureResult,
        validationResult,
        renamedFileName: this.getFilenameFromPath(filePath),
      };
    } catch (error: unknown) {
      this.logger.error('Error during bill analysis:', error);
      throw error;
    } finally {
      // Clean up the uploaded file
      try {
        await fs.unlink(filePath);
        this.logger.log(`Deleted uploaded file: ${filePath}`);
      } catch {
        this.logger.warn(`Failed to delete uploaded file: ${filePath}`);
      }

      this.isProcessing = false;
    }
  }

  /**
   * Validates the analysis result using OpenAI.
   * @param analysisResult - The result from bill analysis.
   * @returns The validation outcome.
   */
  async validateBill(analysisResult: Record<string, unknown>) {
    if (!analysisResult) {
      throw new Error('No analysis result provided for validation');
    }

    try {
      this.logger.log('Starting validation with OpenAI.');

      const validationResult = await this.validateService.validateWithOpenAI(
        analysisResult,
        this.configService.get<string>('OPENAI_ASSISTANT_ID_VALIDATION'),
      );

      return { message: 'Validation complete', validationResult };
    } catch (error) {
      this.logger.error('Error during validation:', error);
      throw error;
    }
  }

  /**
   * Archives the processed bill.
   * @param archiveData - The data to be archived.
   * @returns Confirmation of archiving.
   */
  async archiveBill(archiveData: { billId: string; filePath: string }) {
    try {
      await this.archiveService.archiveBill(archiveData);
      return { success: true, message: 'Bill archived successfully' };
    } catch (error) {
      this.logger.error('Error archiving the bill:', error);
      throw error;
    }
  }

  /**
   * Looks up account data based on the account number.
   * @param accountNumber - The account number to lookup.
   * @returns The account data or null if not found.
   */
  private async lookupAccount(
    accountNumber: string,
  ): Promise<AccountData | null> {
    try {
      const [rows] = await this.temPool.execute<TemMasterViewRow[]>(
        'SELECT * FROM temMasterViewUpdated WHERE accountNumber = ?',
        [accountNumber],
      );

      if (rows.length > 0) {
        const accountDataRow = rows[0];

        const accountData: AccountData = {
          multipleLocations: accountDataRow.multipleLocations,
          accountNumber: accountDataRow.accountNumber,
          customerName: accountDataRow.customerName,
          locationName: accountDataRow.locationName,
          // Map other fields as needed
        };

        return accountData;
      } else {
        // No record found
        return null;
      }
    } catch (error) {
      this.logger.error('Error querying the database:', error);
      throw error;
    }
  }

  /**
   * Extracts the filename from a given file path.
   * @param filePath - The full path of the file.
   * @returns The basename of the file.
   */
  private getFilenameFromPath(filePath: string): string {
    return path.basename(filePath);
  }
}
