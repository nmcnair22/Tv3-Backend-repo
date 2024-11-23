// src/modules/bills/services/bill-type.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { TemMasterViewUpdated } from '../entities/tem-master-view-updated.entity';

@Injectable()
export class BillTypeService {
  constructor(
    @InjectRepository(ProcessingInvoice)
    private invoiceRepository: Repository<ProcessingInvoice>,

    @InjectRepository(TemMasterViewUpdated, 'temConnection') // Specify the TEM connection
    private temRepository: Repository<TemMasterViewUpdated>,
  ) {}

  async determineBillType(invoice: ProcessingInvoice): Promise<void> {
    if (!invoice.customer_id) {
      // No customer_id to match, flag for audit
      invoice.audit_flag = true;
      await this.invoiceRepository.save(invoice);
      return;
    }

    // Clean the customer_id (remove dashes and spaces)
    const cleanedCustomerId = invoice.customer_id.replace(/[-\s]/g, '');

    console.log(`Cleaned Customer ID: ${cleanedCustomerId}`);

    // Lookup in the TEM database
    const temRecord = await this.temRepository.findOne({
      where: { accountNumber: cleanedCustomerId },
    });

    // Print the TEM record retrieved
    console.log('TEM Record:', temRecord);

    if (temRecord) {
      if (temRecord.multipleLocations === 0) {
        // SLB
        invoice.bill_type = 'SLB';
        invoice.audit_flag = false;
      } else if (temRecord.multipleLocations === 1) {
        // MLB
        invoice.bill_type = 'MLB';
        invoice.audit_flag = true; // MLB processing not implemented yet
      }
    } else {
      // No match found, flag for audit
      invoice.audit_flag = true;
      invoice.bill_type = null;
    }

    // Update the invoice with the determined bill type
    await this.invoiceRepository.save(invoice);
  }
}
