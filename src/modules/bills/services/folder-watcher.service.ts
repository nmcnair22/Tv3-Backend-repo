// src/modules/bills/services/folder-watcher.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { JobPriority } from '../../bills/entities/job.entity';
import { JobsService } from '../../jobs/jobs.service';

@Injectable()
export class FolderWatcherService {
  private readonly logger = new Logger(FolderWatcherService.name);

  constructor(private readonly jobsService: JobsService) {
    this.logger.log('FolderWatcherService initialized');
    this.initializeWatcher();
  }

  private initializeWatcher() {
    // Use process.cwd() to get the current working directory
    const folderPath = path.join(process.cwd(), 'Inbox');

    // Log folderPath and __dirname for debugging
    this.logger.log(`__dirname: ${__dirname}`);
    this.logger.log(`Monitoring folder: ${folderPath}`);

    // Ensure the Inbox folder exists
    if (!fs.existsSync(folderPath)) {
      this.logger.error(`Inbox folder does not exist: ${folderPath}`);
      return;
    }

    // Process existing files in the directory (optional)
    this.processExistingFiles(folderPath);

    const watcher = chokidar.watch(folderPath, {
      persistent: true,
      ignoreInitial: true, // Ignore initial files if you don't want to process them at startup
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
        JobPriority.MEDIUM, // Adjust priority as needed
      );
      this.logger.log(`Enqueued job ${job.id} for file ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Error enqueuing job for file ${filePath}: ${error.message}`,
      );
    }
  }
}
