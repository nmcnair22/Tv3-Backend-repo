// src/modules/bills/bills.controller.ts

import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  UsePipes, // Added Import
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { BillsService } from './bills.service';
import { ValidateBillDto } from './dto/validate-bill.dto';
import { JobQueueService } from './services/job-queue.service';

@Controller('bills')
export class BillsController {
  constructor(
    private readonly billsService: BillsService,
    private readonly jobQueueService: JobQueueService,
  ) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
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

    // The file is already saved to './uploads' directory by Multer
    const filePath = file.path;

    // Validate that the file exists before proceeding
    if (!fs.existsSync(filePath)) {
      throw new HttpException('Uploaded file not found on server', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Enqueue the job for processing
      const job = this.jobQueueService.addJob(filePath);

      return {
        message: 'Bill analysis started',
        jobId: job.id,
        renamedFileName: file.filename,
      };
    } catch (error: unknown) {
      // Handle known errors gracefully
      if (error instanceof HttpException) {
        throw error;
      }

      // Log unexpected errors and throw a generic error
      throw new HttpException(
        'An error occurred while processing the bill.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async validateBill(@Body() validateBillDto: ValidateBillDto) {
    try {
      const result = await this.billsService.validateBill(validateBillDto.analysisResult);
      return result;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  @Post('archive')
  async archiveBill(@Body() archiveData: { billId: string; userId: string; filePath: string }) {
    try {
      const result = await this.billsService.archiveBill(archiveData);
      return result;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    if (error instanceof HttpException) {
      throw error;
    }

    // Log the error for debugging purposes
    console.error('An unexpected error occurred:', error);

    // Throw a generic error message
    throw new HttpException(
      'An unexpected error occurred.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
