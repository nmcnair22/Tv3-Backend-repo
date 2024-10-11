// src/modules/dynamics/dynamics-item.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsItemService extends DynamicsBaseService {
  private readonly logger = new Logger(DynamicsItemService.name);

  // Fetch product items
  async getItems(): Promise<any[]> {
    this.logger.debug('Fetching items');
    const url = `${this.apiUrl}/items`;

    const items = [];
    let nextLink: string | undefined = '';

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params: {
            $top: '1000',
          },
        };

        let response;
        if (nextLink) {
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        items.push(...response.data.value);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${items.length} items successfully`);
      return items;
    } catch (error) {
      this.logger.error('Failed to fetch items', error);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch items',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
