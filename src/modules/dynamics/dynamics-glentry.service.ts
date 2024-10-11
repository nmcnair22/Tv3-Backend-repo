// src/modules/dynamics/dynamics-glentry.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsGlEntryService extends DynamicsBaseService {
  private readonly logger = new Logger(DynamicsGlEntryService.name);

  // Existing methods...

  // New method: getGLEntriesByDocumentNumber
  async getGLEntriesByDocumentNumber(documentNumber: string): Promise<any[]> {
    this.logger.debug(`Fetching GL entries for document number: ${documentNumber}`);

    const url = `${this.apiUrl}/generalLedgerEntries`;

    const params: Record<string, string> = {
      $filter: `documentNumber eq '${documentNumber}'`,
      $select: 'documentNumber,postingDate,description,creditAmount,debitAmount,accountNumber',
    };

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      const glEntries = response.data.value;

      this.logger.debug(
        `Fetched ${glEntries.length} GL entries for document number: ${documentNumber}`,
      );

      return glEntries;
    } catch (error) {
      this.logger.error(
        `Failed to fetch GL entries for document number ${documentNumber}: ${error.message}`,
      );
      throw error;
    }
  }
}
