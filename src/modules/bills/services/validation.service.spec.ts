// src/modules/bills/services/validation.service.spec.ts

jest.setTimeout(30000); // Ensure the timeout is sufficient

import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessingInvoiceLineItem } from '../entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { ValidationService } from './validate.service'; // Ensure correct import path

describe('ValidationService Integration Test', () => {
  let service: ValidationService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should validate an invoice using actual database data', async () => {
    // Create the ProcessingInvoice object with the provided data
    const invoice = new ProcessingInvoice();
    invoice.id = 4;
    invoice.invoice_id = '1843079072924';
    invoice.invoice_date = new Date('2024-07-29');
    invoice.due_date = new Date('2024-08-15');
    invoice.vendor_name = "Spectrum BUSINESS'";
    invoice.vendor_address = JSON.parse(
      '{"city": "RIVERVIEW", "road": "S. FALKENBURG RD", "state": "FL", "postalCode": "33578-8652", "houseNumber": "4145", "streetAddress": "4145 S. FALKENBURG RD"}',
    );
    invoice.customer_name = 'TUMI INC';
    invoice.customer_id = '8150 20 007 1843079';
    invoice.customer_address = JSON.parse(
      '{"city": "BEAVERTON", "road": "SW GEMINI DR", "state": "OR", "postalCode": "97008-7105", "houseNumber": "9450", "streetAddress": "9450 SW GEMINI DR"}',
    );
    invoice.invoice_total = 124.98;
    invoice.amount_due = 124.98;
    invoice.service_start_date = new Date('2024-07-29');
    invoice.service_end_date = new Date('2024-08-28');
    // Add other fields as necessary

    // Create the line items
    const lineItemsData = [
      {
        id: 19,
        description: 'Previous Balance',
        amount: 124.98,
      },
      {
        id: 20,
        description: 'Payments Received - Thank You!',
        amount: -124.98,
      },
      {
        id: 21,
        description: 'Spectrum Business™ Internet',
        amount: 119.98,
      },
      {
        id: 22,
        description: 'Other Charges',
        amount: 5.0,
      },
      {
        id: 23,
        description: 'Spectrum Business\nInternet',
        amount: 129.99,
      },
      {
        id: 24,
        description: 'Promotional Discount',
        amount: -30.0,
      },
      {
        id: 29,
        description: 'Static IP 1',
        amount: 19.99,
      },
      // Exclude line items with null amounts if desired
    ];

    const lineItems = lineItemsData.map((itemData) => {
      const lineItem = new ProcessingInvoiceLineItem();
      lineItem.id = itemData.id;
      lineItem.description = itemData.description;
      lineItem.amount = itemData.amount;
      // Set other fields if necessary
      return lineItem;
    });

    invoice.line_items = lineItems;

    try {
      const result = await service.validateInvoice(invoice);

      // Use JSON.stringify to output the full assistant response
      console.log('Assistant response:', JSON.stringify(result, null, 2));

      // Adjust assertions based on expected response
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('level');
      expect(['Pass', 'Fail']).toContain(result.status);
      expect([1, 2]).toContain(result.level);
      // ... other assertions
    } catch (error) {
      console.error('Error during integration test:', error);
      throw error;
    }
  });

  afterEach(async () => {
    await module.close();
  });
});
