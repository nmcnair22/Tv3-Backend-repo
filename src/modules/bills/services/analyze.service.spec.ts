// src/modules/bills/services/analyze.service.spec.ts

jest.setTimeout(120000);

import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { ProcessingInvoiceLineItem } from '../entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { AnalyzeService } from './analyze.service';

describe('AnalyzeService', () => {
  let service: AnalyzeService;
  let moduleRef: TestingModule;
  let invoiceRepository: Repository<ProcessingInvoice>;
  let lineItemRepository: Repository<ProcessingInvoiceLineItem>;

  beforeAll(async () => {
    try {
      // Set dummy Azure credentials for testing
      process.env.AZURE_FORM_RECOGNIZER_KEY =
        'd0c38f102a794dc88004ec5e18c16531';
      process.env.AZURE_FORM_RECOGNIZER_ENDPOINT =
        'https://docuscantemnc.cognitiveservices.azure.com/';

      const dbHost = '127.0.0.1';
      const dbPort = 3306;
      const dbUsername = 'root';
      const dbPassword = 'Eastw00d';
      const dbDatabase = 'business_central_db';

      moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [],
          }),
          TypeOrmModule.forRoot({
            type: 'mysql',
            host: dbHost,
            port: dbPort,
            username: dbUsername,
            password: dbPassword,
            database: dbDatabase,
            entities: [ProcessingInvoice, ProcessingInvoiceLineItem],
            synchronize: true,
            logging: true,
          }),
          TypeOrmModule.forFeature([
            ProcessingInvoice,
            ProcessingInvoiceLineItem,
          ]),
        ],
        providers: [AnalyzeService],
      }).compile();

      service = moduleRef.get<AnalyzeService>(AnalyzeService);
      invoiceRepository = moduleRef.get<Repository<ProcessingInvoice>>(
        getRepositoryToken(ProcessingInvoice),
      );
      lineItemRepository = moduleRef.get<Repository<ProcessingInvoiceLineItem>>(
        getRepositoryToken(ProcessingInvoiceLineItem),
      );
    } catch (error) {
      console.error('Error during module initialization:', error);
    }
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should analyze all test bills in assets folder and save to database', async () => {
    const assetsDir = path.join(__dirname, '../../../../test/assets');

    const files = fs.readdirSync(assetsDir);
    const pdfFiles = files.filter((file) => file.endsWith('.pdf'));

    expect(pdfFiles.length).toBeGreaterThan(0);

    for (const file of pdfFiles) {
      const filePath = path.join(assetsDir, file);
      console.log(`Processing file: ${file}`);

      try {
        const result = await service.analyzeWithAzure(filePath);
        console.log(
          'Analysis Result for',
          file,
          ':',
          JSON.stringify(result, null, 2),
        );
        expect(result).toBeDefined();
      } catch (error) {
        console.error(`Error processing file ${file}: ${error.message}`);
      }
    }

    const invoices = await invoiceRepository.find({
      relations: ['line_items'],
    });
    console.log(
      'Invoices saved to database:',
      JSON.stringify(invoices, null, 2),
    );
    expect(invoices.length).toBeGreaterThan(0);

    const lineItems = await lineItemRepository.find();
    console.log(
      'Line items saved to database:',
      JSON.stringify(lineItems, null, 2),
    );
    expect(lineItems.length).toBeGreaterThan(0);
  });
});
