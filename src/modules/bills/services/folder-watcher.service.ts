// src/modules/bills/services/folder-watcher.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { JobPriority } from '../../bills/entities/job.entity';
import { JobsService } from '../../jobs/jobs.service';
import { BillGateway } from '../bill.gateway';
import { BillsService } from '../bills.service';

@Injectable()
export class FolderWatcherService {
  private readonly logger = new Logger(FolderWatcherService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly billsService: BillsService,
    private readonly billGateway: BillGateway,
  ) {
    this.logger.log('FolderWatcherService initialized');
    this.initializeWatcher();
  }

  private initializeWatcher() {
    const folderPath = path.join(process.cwd(), 'Inbox');

    this.logger.log(`Monitoring folder: ${folderPath}`);

    if (!fs.existsSync(folderPath)) {
      this.logger.error(`Inbox folder does not exist: ${folderPath}`);
      return;
    }

    // Optional: Process existing files at startup
    this.processExistingFiles(folderPath);

    const watcher = chokidar.watch(folderPath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('add', async (filePath) => {
      this.logger.log(`File added: ${filePath}`);
      await this.enqueueJobForFile(filePath);
    });

    watcher.on('error', (error) => {
      this.logger.error(`Watcher error: ${error}`);
    });
  }

  private async processExistingFiles(folderPath: string) {
    this.logger.log(`Processing existing files in: ${folderPath}`);
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      this.logger.log(`Found existing file: ${filePath}`);
      await this.enqueueJobForFile(filePath);
    }
  }

  private async enqueueJobForFile(filePath: string) {
    try {
      const job = await this.jobsService.enqueueJob(
        'process_bill',
        { filePath },
        JobPriority.MEDIUM,
      );
      this.logger.log(`Enqueued job ${job.id} for file ${filePath}`);

      // After successfully enqueuing a job, fetch updated processing queue
      const updatedQueue = await this.billsService.getProcessingQueue();
      // Emit the updated queue to all connected clients
      this.billGateway.emitProcessingQueueUpdate(updatedQueue);
    } catch (error) {
      this.logger.error(
        `Error enqueuing job for file ${filePath}: ${error.message}`,
      );
    }
  }
}
