// src/modules/bills/services/bill-type.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { TemMasterView } from '../entities/tem-master-view.entity';

// Import the utility function
import { cleanAccountNumber } from '../../../utils/account-number.util';

@Injectable()
export class BillTypeService {
  private readonly logger = new Logger(BillTypeService.name);

  constructor(
    @InjectRepository(ProcessingInvoice)
    private invoiceRepository: Repository<ProcessingInvoice>,

    @InjectRepository(TemMasterView, 'temConnection')
    private readonly temMasterViewRepository: Repository<TemMasterView>,
  ) {}

  async determineBillType(invoice: ProcessingInvoice): Promise<void> {
    if (!invoice.customer_id) {
      // No customer_id to match, flag for audit
      invoice.audit_flag = true;
      await this.invoiceRepository.save(invoice);
      return;
    }

    // Clean the customer_id
    const cleanedCustomerId = cleanAccountNumber(invoice.customer_id);

    this.logger.log(`Cleaned Customer ID: ${cleanedCustomerId}`);

    // Lookup in the TEM database
    const temRecord = await this.temMasterViewRepository.findOne({
      where: { accountNumber: cleanedCustomerId },
    });

    // Log the TEM record retrieved
    if (temRecord) {
      this.logger.log(
        `TEM Record found for Account Number: ${cleanedCustomerId}`,
      );
    } else {
      this.logger.warn(
        `TEM Record not found for Account Number: ${cleanedCustomerId}`,
      );
    }

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

  /**
   * Retrieves the TEM record corresponding to a given invoice.
   * @param invoice - The ProcessingInvoice entity.
   * @returns The TemMasterView record or null if not found.
   */
  public async getTemRecord(
    invoice: ProcessingInvoice,
  ): Promise<TemMasterView | null> {
    try {
      // Extract and clean the account number from the invoice
      const rawAccountNumber = invoice.customer_id || '';

      // Clean the account number
      const cleanedAccountNumber = cleanAccountNumber(rawAccountNumber);

      this.logger.log(`Raw Account Number: ${rawAccountNumber}`);
      this.logger.log(`Cleaned Account Number: ${cleanedAccountNumber}`);

      // Query the TEM master view for the cleaned account number
      const temRecord = await this.temMasterViewRepository.findOne({
        where: { accountNumber: cleanedAccountNumber },
      });

      if (temRecord) {
        this.logger.log(
          `TEM record found for Account Number: ${cleanedAccountNumber}`,
        );
      } else {
        this.logger.warn(
          `TEM record not found for Account Number: ${cleanedAccountNumber}`,
        );
      }

      return temRecord || null;
    } catch (error) {
      this.logger.error(
        `Error fetching TEM record for Account Number: ${invoice.customer_id}`,
        error,
      );
      throw error;
    }
  }
}
