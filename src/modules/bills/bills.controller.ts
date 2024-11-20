// src/modules/bills/bills.controller.ts

import {
  Body,
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
import { JobsService } from '../jobs/jobs.service';
import { BillsService } from './bills.service';
import { ValidateBillDto } from './dto/validate-bill.dto';

@Controller('api/bills') // Prefix all routes with /api/bills
export class BillsController {
  private readonly logger = new Logger(BillsController.name);

  constructor(
    private readonly billsService: BillsService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Uploads and enqueues a bill for processing.
   * @param file - The uploaded PDF file.
   * @returns Job initiation response.
   */
  @Post('analyze')
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
    }),
  )
  async analyzeBill(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{
    message: string;
    jobId: string;
    renamedFileName: string;
  }> {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const filePath = file.path;

    if (!fs.existsSync(filePath)) {
      throw new HttpException('Uploaded file not found on server', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Enqueue the job for processing
      const job = await this.jobsService.enqueueJob('process_bill', { filePath });

      return {
        message: 'Bill analysis enqueued',
        jobId: job.id,
        renamedFileName: file.filename,
      };
    } catch (error) {
      this.logger.error('Error enqueuing bill processing job:', error);
      throw new HttpException(
        'An error occurred while processing the bill.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves active jobs.
   * @returns Array of active jobs.
   */
  @Get('current-jobs')
  async getCurrentJobs() {
    const jobs = await this.jobsService.getActiveJobs();
    return jobs.map(job => ({
      id: job.id,
      type: job.type,
      payload: job.payload,
      status: job.status,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));
  }

  /**
   * Retrieves processed bills from the database.
   * @returns Array of processed bills.
   */
  @Get('processed')
  async getProcessedBills() {
    try {
      const processedBills = await this.billsService.getProcessedBills();
      return processedBills;
    } catch (error) {
      this.logger.error('Failed to fetch processed bills:', error);
      throw new HttpException('Failed to fetch processed bills', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Validates a bill manually if needed.
   * @param validateBillDto - Data for validation.
   * @returns Validation result.
   */
  @Post('validate')
  async validateBill(@Body() validateBillDto: ValidateBillDto) {
    try {
      const result = await this.billsService.validateBill(validateBillDto.analysisResult);
      return result;
    } catch (error) {
      this.logger.error('Validation failed:', error);
      throw new HttpException('Validation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Archives a bill.
   * @param archiveData - Data for archiving.
   * @returns Archiving result.
   */
  @Post('archive')
  async archiveBill(@Body() archiveData: { billId: string; filePath: string }) {
    try {
      const result = await this.billsService.archiveBill(archiveData);
      return result;
    } catch (error) {
      this.logger.error('Archiving failed:', error);
      throw new HttpException('Archiving failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
