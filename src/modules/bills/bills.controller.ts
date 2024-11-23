// src/modules/bills/bills.controller.ts

import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { BillsService } from './bills.service';

@Controller('api/bills') // Prefix all routes with /api/bills
export class BillsController {
  private readonly logger = new Logger(BillsController.name);

  constructor(private readonly billsService: BillsService) {}

  /**
   * Uploads and processes a single bill.
   * @param file - The uploaded PDF file.
   * @returns Processing result.
   */
  @Post('process')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new Error('Only PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit
      },
      dest: './uploads/', // Ensure this directory exists
    }),
  )
  async processBill(@UploadedFile() file: Express.Multer.File): Promise<any> {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const filePath = file.path;

    if (!fs.existsSync(filePath)) {
      throw new HttpException(
        'Uploaded file not found on server',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      // Process the bill
      const result = await this.billsService.processBill(filePath);

      // Optionally delete the uploaded file after processing
      fs.unlinkSync(filePath);

      return result;
    } catch (error) {
      this.logger.error('Error processing bill:', error);
      throw new HttpException(
        'An error occurred while processing the bill.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Processes all bills in the assets folder.
   * @returns An array of processing results.
   */
  @Post('process-all')
  async processAllBills(): Promise<any> {
    try {
      const assetsDir = path.join(__dirname, '../../../../test/assets');

      const results =
        await this.billsService.processAllBillsInFolder(assetsDir);

      return {
        message: 'Batch processing completed',
        results: results,
      };
    } catch (error) {
      this.logger.error('Error during batch bill processing:', error);
      throw new HttpException(
        'An error occurred while processing the bills.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves all processed invoices.
   * @returns Array of processed invoices.
   */
  @Get('processed')
  async getProcessedInvoices() {
    try {
      const invoices = await this.billsService.getProcessedInvoices();
      return invoices;
    } catch (error) {
      this.logger.error('Failed to fetch processed invoices:', error);
      throw new HttpException(
        'Failed to fetch processed invoices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Add additional endpoints as needed
}
