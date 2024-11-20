// src/modules/bills/services/archive.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private readonly archivePath = path.resolve(__dirname, '../../../archives');

  constructor() {
    this.ensureArchiveDirectory();
  }

  /**
   * Ensures that the archive directory exists.
   */
  private async ensureArchiveDirectory() {
    try {
      await fs.mkdir(this.archivePath, { recursive: true });
      this.logger.log(`Archive directory is set at: ${this.archivePath}`);
    } catch (error) {
      this.logger.error('Error creating archive directory:', error);
      throw error;
    }
  }

  /**
   * Archives the bill by moving it to the archive directory.
   * @param filePath - Path to the file to archive.
   */
  async archiveBill(filePath: string) {
    try {
      const fileName = path.basename(filePath);
      const destination = path.join(this.archivePath, fileName);
      await fs.rename(filePath, destination);
      this.logger.log(`Archived bill: ${fileName} to ${destination}`);
    } catch (error) {
      this.logger.error(`Error archiving bill ${filePath}:`, error);
      throw error;
    }
  }
}
