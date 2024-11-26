// src/modules/bills/bills.controller.ts

import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { BillsService } from './bills.service';

@Controller('api/bills')
export class BillsController {
  private readonly logger = new Logger(BillsController.name);

  constructor(private readonly billsService: BillsService) {}

  /**
   * Uploads and processes bills (single or multiple).
   * @param files - The uploaded PDF files.
   * @returns Processing results.
   */
  @Post('process')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      // Adjust maxCount as needed
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new Error('Only PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit per file
      },
      dest: './uploads/', // Ensure this directory exists
    }),
  )
  async processBills(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    if (!files || files.length === 0) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      // Process each bill concurrently
      const processingPromises = files.map(async (file) => {
        const filePath = file.path;

        if (!fs.existsSync(filePath)) {
          this.logger.error(`Uploaded file not found on server: ${filePath}`);
          return {
            file: file.originalname,
            error: 'Uploaded file not found on server',
          };
        }

        try {
          const result = await this.billsService.processBill(filePath);

          // Optionally delete the uploaded file after processing
          // fs.unlinkSync(filePath);

          return {
            file: file.originalname,
            result,
          };
        } catch (error) {
          this.logger.error(
            `Error processing bill ${file.originalname}:`,
            error,
          );
          return {
            file: file.originalname,
            error:
              error.message || 'An error occurred while processing the bill.',
          };
        }
      });

      const results = await Promise.all(processingPromises);

      return {
        message: 'Bills processed successfully',
        results,
      };
    } catch (error) {
      this.logger.error('Error processing bills:', error);
      throw new HttpException(
        'An error occurred while processing the bills.',
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
