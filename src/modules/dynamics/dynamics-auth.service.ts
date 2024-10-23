// src/modules/dynamics/dynamics-auth.service.ts
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DynamicsAuthService {
  private readonly logger = new Logger(DynamicsAuthService.name);
  private accessToken: string;
  private accessTokenExpiry: Date;
  private readonly tokenUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const tenantId = this.configService.get<string>('tenant_id');
    this.tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    this.accessToken = '';
    this.accessTokenExpiry = new Date();
  }

  // Fetch and cache the access token from Microsoft
  async fetchAccessToken(): Promise<string> {
    // Check if the token is still valid
    if (this.accessToken && this.accessTokenExpiry > new Date()) {
      return this.accessToken;
    }

    this.logger.debug('Fetching access token from Microsoft');

    const tokenData = {
      client_id: this.configService.get<string>('client_id'),
      client_secret: this.configService.get<string>('client_secret'),
      grant_type: 'client_credentials',
      scope: this.configService.get<string>('scope'),
    };

    const data = new URLSearchParams(tokenData);

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.tokenUrl, data.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in; // Token validity in seconds
      this.accessTokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);

      this.logger.debug(`Access token fetched successfully`);
      return this.accessToken;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch access token: ${err.message}`);
      if (err.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(err.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch access token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get headers for API requests
  async getHeaders(): Promise<any> {
    const accessToken = await this.fetchAccessToken();
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}
