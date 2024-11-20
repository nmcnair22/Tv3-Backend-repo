// src/modules/bills/services/bills.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository } from 'typeorm';
import { AzureBill } from './entities/azure-bill.entity';
import { AccountData } from './interfaces/account-data.interface';
import { ExtractedData } from './interfaces/extracted-data.interface';
import { AnalyzeService } from './services/analyze.service';
import { ArchiveService } from './services/archive.service';
import { ValidateService } from './services/validate.service';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly analyzeService: AnalyzeService,
    private readonly validateService: ValidateService,
    private readonly archiveService: ArchiveService,
    private readonly configService: ConfigService,
    @InjectRepository(AzureBill)
    private readonly azureBillRepository: Repository<AzureBill>,
  ) {}

  /**
   * Processes the uploaded bill.
   * @param filePath - The path to the uploaded PDF file.
   * @returns Processing result.
   */
  async analyzeBill(filePath: string) {
    if (!filePath) {
      this.logger.warn('No file path provided.');
      throw new Error('No file path provided');
    }

    try {
      this.logger.log(`Starting analysis for file: ${filePath}`);

      // Analyze the bill using Azure ADI
      const azureResult: ExtractedData = await this.analyzeService.analyzeWithAzure(filePath);

      // Lookup account data based on CustomerId
      const { CustomerId } = azureResult;
      if (!CustomerId) {
        throw new Error('CustomerId not found in extracted data.');
      }

      const accountData: AccountData | null = await this.lookupAccount(CustomerId.trim());

      if (!accountData) {
        this.logger.log('New Account Detected. Processing as SLB.');
        // SLB: Single Location Bill
        return await this.processSLB(azureResult, filePath);
      }

      if (accountData.multipleLocations === 1) {
        this.logger.log(`MLB detected for CustomerId: ${CustomerId}. Processing as MLB.`);
        // MLB: Multiple Location Bill
        return await this.processMLB(azureResult, filePath);
      }

      this.logger.log(`SLB detected for CustomerId: ${CustomerId}. Processing as SLB.`);
      // SLB: Single Location Bill
      return await this.processSLB(azureResult, filePath);
    } catch (error: unknown) {
      this.logger.error('Error during bill processing:', error);
      throw error;
    }
  }

  /**
   * Processes Single Location Bills (SLB).
   * @param azureResult - Extracted data from Azure ADI.
   * @param filePath - Path to the uploaded file.
   * @returns Processing result.
   */
  private async processSLB(azureResult: ExtractedData, filePath: string) {
    // Validate the bill using OpenAI
    const validationResult = await this.validateService.validateWithOpenAI(
      azureResult as Record<string, unknown>, // Type assertion to satisfy method signature
      this.configService.get<string>('OPENAI_ASSISTANT_ID_VALIDATION'),
    );

    // Generate fingerprint asynchronously
    const fingerprint = await this.generateFingerprint(filePath);

    // Save to database
    const savedBill = await this.saveProcessedBill({
      billType: 'SLB',
      fieldValues: azureResult,
      validationResult,
      fileName: this.getFilenameFromPath(filePath),
      fingerprint,
    });

    // Archive the bill
    await this.archiveService.archiveBill(filePath);

    return {
      message: 'SLB Processing complete',
      billType: 'SLB',
      savedBill,
    };
  }

  /**
   * Processes Multiple Location Bills (MLB).
   * @param azureResult - Extracted data from Azure ADI.
   * @param filePath - Path to the uploaded file.
   * @returns Processing result.
   */
  private async processMLB(azureResult: ExtractedData, filePath: string) {
    // Validate the bill using OpenAI
    const validationResult = await this.validateService.validateWithOpenAI(
      azureResult as Record<string, unknown>, // Type assertion to satisfy method signature
      this.configService.get<string>('OPENAI_ASSISTANT_ID_VALIDATION'),
    );

    // Generate fingerprint asynchronously
    const fingerprint = await this.generateFingerprint(filePath);

    // Save to database
    const savedBill = await this.saveProcessedBill({
      billType: 'MLB',
      fieldValues: azureResult,
      validationResult,
      fileName: this.getFilenameFromPath(filePath),
      fingerprint,
    });

    // Archive the bill
    await this.archiveService.archiveBill(filePath);

    return {
      message: 'MLB Processing complete',
      billType: 'MLB',
      savedBill,
    };
  }

  /**
   * Saves the processed bill to the database.
   * @param billData - Data of the processed bill.
   * @returns The saved bill entity.
   */
  private async saveProcessedBill(billData: {
    billType: string;
    fieldValues: ExtractedData;
    validationResult: any;
    fileName: string;
    fingerprint: string;
  }): Promise<AzureBill> {
    try {
      const newBill = this.azureBillRepository.create({
        billType: billData.billType,
        fieldValues: JSON.stringify(billData.fieldValues),
        validationResult: JSON.stringify(billData.validationResult),
        fileName: billData.fileName,
        fingerprint: billData.fingerprint,
        processedAt: new Date(),
      });

      await this.azureBillRepository.save(newBill);
      this.logger.log(`Saved processed bill: ${newBill.fileName}`);

      return newBill;
    } catch (error) {
      this.logger.error('Error saving processed bill:', error);
      throw error;
    }
  }

  /**
   * Looks up account data based on the account number.
   * @param accountNumber - The account number to lookup.
   * @returns The account data or null if not found.
   */
  private async lookupAccount(accountNumber: string): Promise<AccountData | null> {
    try {
      // Implement your MySQL lookup logic here
      // Example using TypeORM repository
      // Assuming you have an AccountData entity and repository

      // Placeholder return
      // Replace with actual database query
      return null;
    } catch (error) {
      this.logger.error('Error querying the database:', error);
      throw error;
    }
  }

  /**
   * Generates a fingerprint for the bill to prevent duplicates.
   * @param filePath - Path to the uploaded file.
   * @returns A unique fingerprint string.
   */
  private async generateFingerprint(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      this.logger.error('Error generating fingerprint:', error);
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

  /**
   * Retrieves all processed bills from the database.
   * @returns An array of processed bills.
   */
  async getProcessedBills() {
    try {
      const bills = await this.azureBillRepository.find({
        order: { processedAt: 'DESC' },
      });
      return bills;
    } catch (error) {
      this.logger.error('Error fetching processed bills:', error);
      throw error;
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
   * @param archiveData - Data to be archived.
   * @returns Confirmation of archiving.
   */
  async archiveBill(archiveData: { billId: string; filePath: string }) {
    try {
      await this.archiveService.archiveBill(archiveData.filePath);
      return { success: true, message: 'Bill archived successfully' };
    } catch (error) {
      this.logger.error('Error archiving the bill:', error);
      throw error;
    }
  }
}
