// src/modules/bills/services/bill-type.service.spec.ts

jest.setTimeout(30000);

import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ProcessingInvoiceLineItem } from '../entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { TemMasterViewUpdated } from '../entities/tem-master-view-updated.entity';
import { BillTypeService } from './bill-type.service';

describe('BillTypeService Integration Test', () => {
  let service: BillTypeService;
  let module: TestingModule;
  let invoiceRepository: Repository<ProcessingInvoice>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          name: 'default',
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            type: 'mysql',
            host: configService.get<string>('DB_HOST'),
            port: parseInt(configService.get<string>('DB_PORT'), 10),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_DATABASE'),
            charset: 'utf8mb4_general_ci',
            entities: [ProcessingInvoice, ProcessingInvoiceLineItem],
            synchronize: true,
            autoLoadEntities: true,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forRootAsync({
          name: 'temConnection',
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            type: 'mysql',
            host: configService.get<string>('TEM_DB_HOST'),
            port: parseInt(configService.get<string>('TEM_DB_PORT'), 10),
            username: configService.get<string>('TEM_DB_USERNAME'),
            password: configService.get<string>('TEM_DB_PASSWORD'),
            database: configService.get<string>('TEM_DB_DATABASE'),
            charset: 'utf8mb4_general_ci',
            entities: [TemMasterViewUpdated],
            synchronize: false,
            autoLoadEntities: true,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature(
          [ProcessingInvoice, ProcessingInvoiceLineItem],
          'default',
        ),
        TypeOrmModule.forFeature([TemMasterViewUpdated], 'temConnection'),
      ],
      providers: [BillTypeService],
    }).compile();

    service = module.get<BillTypeService>(BillTypeService);
    invoiceRepository = module.get<Repository<ProcessingInvoice>>(
      getRepositoryToken(ProcessingInvoice, 'default'),
    );
  });

  afterAll(async () => {
    if (module) {
      try {
        await module.close();
        console.log('Module closed successfully.');
      } catch (error) {
        if (
          error.message.includes(
            'Nest could not find DataSource element (this provider does not exist in the current context)',
          )
        ) {
          // Ignore this specific error
          console.warn(
            'Warning: Ignored DataSource not found error during module shutdown.',
          );
        } else {
          console.error('Error closing module:', error);
          throw error; // Re-throw other unknown errors
        }
      }
    }
  });

  it('should determine bill type using real data', async () => {
    // Arrange
    const invoice = await invoiceRepository.findOne({
      where: { customer_id: Not(IsNull()) },
    });

    if (!invoice) {
      throw new Error('No invoice with customer_id found in the database.');
    }

    // Keep the original values for cleanup
    const originalAuditFlag = invoice.audit_flag;
    const originalBillType = invoice.bill_type;

    // Act
    await service.determineBillType(invoice);

    // Assert
    console.log(`Invoice ID: ${invoice.id}`);
    console.log(`Customer ID: ${invoice.customer_id}`);
    console.log(`Bill Type: ${invoice.bill_type}`);
    console.log(`Audit Flag: ${invoice.audit_flag}`);

    // Cleanup: Restore original values if necessary
    invoice.audit_flag = originalAuditFlag;
    invoice.bill_type = originalBillType;
    await invoiceRepository.save(invoice);
  });
});
