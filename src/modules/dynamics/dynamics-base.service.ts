// src/modules/dynamics/dynamics-base.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamicsAuthService } from './dynamics-auth.service';

@Injectable()
export class DynamicsBaseService {
  protected readonly apiUrl: string;
  protected readonly reportsApiUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly dynamicsAuthService: DynamicsAuthService,
  ) {
    const tenantId = this.configService.get<string>('tenant_id');
    const environmentId = this.configService.get<string>('environment_id');
    const companyId = this.configService.get<string>('company_id');

    // Base URL for standard APIs
    this.apiUrl = `https://api.businesscentral.dynamics.com/v2.0/${environmentId}/api/v2.0/companies(${companyId})`;

    // Base URL for reportsFinance APIs
    this.reportsApiUrl = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environmentId}/api/microsoft/reportsFinance/v2.0/companies(${companyId})`;
  }

  // Get headers using the DynamicsAuthService
  protected async getHeaders(): Promise<any> {
    return this.dynamicsAuthService.getHeaders();
  }
}
