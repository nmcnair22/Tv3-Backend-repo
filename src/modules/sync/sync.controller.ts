// src/modules/sync/sync.controller.ts

import { Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { SyncService } from './sync.service'; // Corrected import path

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Manual Synchronization Endpoint
   * POST /sync/manual
   */
  @Post('manual')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(BasicAuthGuard) // Removed as per your preference
  async manualSync() {
    this.logger.debug('Manual synchronization triggered');
    try {
      await this.syncService.syncAll();
      return { message: 'Synchronization completed successfully' };
    } catch (error) {
      this.logger.error('Manual synchronization failed', error.stack);
      return { message: 'Synchronization failed', error: error.message };
    }
  }
}
