// src/modules/bills/bills.controller.ts

import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer'; // <-- import diskStorage
import * as path from 'path';

import { JobsService } from '../jobs/jobs.service';
import { BillGateway } from './bill.gateway';
import { BillsService } from './bills.service';
import { JobEntity, JobPriority } from './entities/job.entity';
import { ProcessingInvoice } from './entities/processing-invoice.entity';
import { EventLogService } from './services/event-log.service';
import { MissingBillsService } from './services/missing-bills.service';

// Import your RAG service
import { RagService } from './services/rag.service';

const ARCHIVE_BASE_PATH = 'C:\\Users\\nate.mcnair\\Tritonv3\\backend\\Archive';

@Controller('api/bills')
export class BillsController {
  private readonly logger = new Logger(BillsController.name);

  constructor(
    private readonly billsService: BillsService,
    private readonly jobsService: JobsService,
    private readonly billGateway: BillGateway,
    private readonly eventLogService: EventLogService,
    private readonly missingBillsService: MissingBillsService,
    private readonly ragService: RagService, // RAG service
  ) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadBills(@UploadedFiles() files: Express.Multer.File[]) {
    const jobIds: string[] = [];
    for (const file of files) {
      const job = await this.jobsService.enqueueJob(
        'process_bill',
        { filePath: file.path },
        JobPriority.MEDIUM,
      );
      jobIds.push(job.id);
    }

    const updatedQueue = await this.billsService.getProcessingQueue();
    this.billGateway.emitProcessingQueueUpdate(updatedQueue);

    return { message: 'Files uploaded and jobs created', jobIds };
  }

  @Post('process')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new Error('Only PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
      dest: './uploads/', // older approach for disk usage
    }),
  )
  async processBills(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    if (!files || files.length === 0) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      const jobIds: string[] = [];
      for (const file of files) {
        const job = await this.jobsService.enqueueJob(
          'process_bill',
          { filePath: file.path },
          JobPriority.MEDIUM,
        );
        jobIds.push(job.id);
      }

      const updatedQueue = await this.billsService.getProcessingQueue();
      this.billGateway.emitProcessingQueueUpdate(updatedQueue);

      return { message: 'Files queued for processing', jobIds };
    } catch (error) {
      this.logger.error('Error processing bills:', error);
      throw new HttpException(
        'Error processing the bills.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('process-all')
  async processAllBills(): Promise<any> {
    try {
      const assetsDir = path.join(__dirname, '../../../../test/assets');
      const results =
        await this.billsService.processAllBillsInFolder(assetsDir);
      return { message: 'Batch processing completed', results };
    } catch (error) {
      this.logger.error('Error during batch bill processing:', error);
      throw new HttpException(
        'Error processing the bills.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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

  @Get('processing-queue')
  async getProcessingQueue(): Promise<JobEntity[]> {
    try {
      const queue = await this.jobsService.getJobsInQueue('process_bill');
      return queue;
    } catch (error) {
      this.logger.error('Failed to fetch processing queue:', error);
      throw new HttpException(
        'Failed to fetch processing queue',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('audit')
  async getAuditBills(): Promise<ProcessingInvoice[]> {
    try {
      const auditBills = await this.billsService.getAuditBills();
      return auditBills;
    } catch (error) {
      this.logger.error('Failed to fetch audit bills:', error);
      throw new HttpException(
        'Failed to fetch audit bills',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('processed-recent')
  async getProcessedRecent(@Query('hours') hours: string) {
    const hoursNum = parseInt(hours, 10);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      throw new BadRequestException('Invalid hours parameter');
    }
    this.logger.log(
      `Fetching Processed Bills from the last ${hoursNum} hours...`,
    );
    const processed = await this.billsService.getProcessedRecent(hoursNum);
    this.logger.log(`Processed Bills Retrieved: ${processed.length} bills.`);
    return processed;
  }

  @Get('bill/:billId')
  async getBillById(@Param('billId') billId: string) {
    const idNum = parseInt(billId, 10);
    if (isNaN(idNum) || idNum <= 0) {
      throw new BadRequestException('Invalid billId parameter');
    }
    this.logger.log(`Fetching Bill with ID: ${idNum}`);
    const bill = await this.billsService.getBillById(idNum);
    if (!bill) {
      throw new NotFoundException(`Bill with ID ${idNum} not found`);
    }
    this.logger.log(`Bill Retrieved: ID ${idNum}`);
    return bill;
  }

  @Get('file')
  async getBillFile(
    @Query('path') filePathParam: string,
    @Res() res: Response,
  ) {
    this.logger.log(
      `Incoming request to /api/bills/file: path=${filePathParam}`,
    );
    if (!filePathParam) {
      throw new BadRequestException('Missing path query parameter');
    }

    const cleanedPath = filePathParam.replace(/\\/g, '/');
    const filePath = cleanedPath;
    this.logger.log(`Final file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      this.logger.warn(`File not found: ${filePath}`);
      return res.status(404).send('File not found');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="bill.pdf"',
    });

    this.logger.log(`Sending file: ${filePath}`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('open', () => {
      this.logger.log('File stream opened, piping to response.');
      fileStream.pipe(res);
    });
    fileStream.on('error', (err) => {
      this.logger.error('Error reading file:', err);
      res.status(404).send('File not found');
    });
    fileStream.on('end', () => {
      this.logger.log('File sent successfully');
    });
  }

  @Get('events/:jobId')
  async getEventsForJob(@Param('jobId') jobId: string) {
    if (!jobId) {
      throw new BadRequestException('jobId is required');
    }

    try {
      const events = await this.eventLogService.getEventsByJobId(jobId);
      return events;
    } catch (error) {
      this.logger.error(`Failed to fetch events for jobId ${jobId}:`, error);
      throw new HttpException(
        'Failed to fetch event logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** MISSING BILLS ENDPOINTS **/

  @Post('missing-bills/run-check')
  async runMissingBillsCheck(): Promise<{ message: string }> {
    await this.missingBillsService.runMissingBillsCheck();
    return { message: 'Missing bills check completed' };
  }

  @Get('missing-bills')
  async getMissingBills(): Promise<any[]> {
    try {
      const data =
        await this.missingBillsService.getMissingAccountsWithDetails();
      return data;
    } catch (error) {
      this.logger.error('Failed to fetch missing bills:', error);
      throw new HttpException(
        'Failed to fetch missing bills',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** RAG PROCESS (Vision optional) **/
  @Post('rag/process')
  @UseInterceptors(
    FileInterceptor('file', {
      // 1) Use diskStorage so that `file.path` is set
      storage: diskStorage({
        destination: './uploads', // folder for your PDFs
        filename: (req, file, cb) => {
          // create a unique file name
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `bill-${uniqueSuffix}.pdf`);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024, // e.g. 20MB if you want
      },
    }),
  )
  async processRagBill(
    @UploadedFile() file: Express.Multer.File,
    @Query('useVision') useVision: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.debug(`Received file on disk: ${file.path}`);

    const visionFlag = useVision === 'true';
    const docId = `RAG-Doc-${Date.now()}`;

    await this.ragService.processBillForRag(file.path, docId, visionFlag);

    return { message: 'RAG process completed', useVision: visionFlag, docId };
  }

  /**
   * Example optional endpoint to ask questions about a doc
   * e.g. GET /api/bills/rag/ask?docId=RAG-Doc-168618&question=What's%20the%20total%3F
   */
  @Get('rag/ask')
  async askQuestion(
    @Query('docId') docId: string,
    @Query('question') question: string,
  ) {
    if (!docId || !question) {
      throw new BadRequestException('Must provide docId and question');
    }
    const answer = await this.ragService.askQuestion(docId, question);
    return { docId, question, answer };
  }
}
