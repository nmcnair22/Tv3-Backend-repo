// src/modules/bills/services/bill-type.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { TemMasterView } from '../entities/tem-master-view.entity';

// Import the utility function
import { cleanAccountNumber } from '../../../utils/account-number.util';

import { BillGateway } from '../bill.gateway';
import { EventType } from '../entities/event-log.entity';
import { EventLogService } from './event-log.service';

@Injectable()
export class BillTypeService {
  private readonly logger = new Logger(BillTypeService.name);

  constructor(
    @InjectRepository(ProcessingInvoice)
    private invoiceRepository: Repository<ProcessingInvoice>,

    @InjectRepository(TemMasterView, 'temConnection')
    private readonly temMasterViewRepository: Repository<TemMasterView>,

    // Added dependencies for updates and logging
    private readonly billGateway: BillGateway,
    private readonly eventLogService: EventLogService,
  ) {}

  // Updated to include jobId parameter
  async determineBillType(
    invoice: ProcessingInvoice,
    jobId: string,
  ): Promise<void> {
    // Emit initial update and log event for starting bill type determination
    this.billGateway.emitUpdate(jobId, {
      status: 'Processing',
      step: 'DeterminingBillType',
      detail: 'Determining bill type based on customer_id and TEM record...',
    });
    await this.eventLogService.logEvent(
      jobId,
      EventType.INFO,
      'Starting bill type determination.',
    );

    if (!invoice.customer_id) {
      // No customer_id to match, flag for audit
      invoice.audit_flag = true;
      await this.invoiceRepository.save(invoice);

      this.billGateway.emitUpdate(jobId, {
        status: 'Audit',
        step: 'FlaggedForAudit',
        detail: 'No customer_id found, invoice flagged for audit.',
      });
      await this.eventLogService.logEvent(
        jobId,
        EventType.WARNING,
        'No customer_id found. Invoice flagged for audit.',
      );
      return;
    }

    // Clean the customer_id
    const cleanedCustomerId = cleanAccountNumber(invoice.customer_id);
    this.logger.log(`Cleaned Customer ID: ${cleanedCustomerId}`);

    // Emit update before looking up TEM record
    this.billGateway.emitUpdate(jobId, {
      status: 'Processing',
      step: 'DeterminingBillType',
      detail: `Looking up TEM record for Customer ID: ${cleanedCustomerId}...`,
    });

    // Lookup in the TEM database
    const temRecord = await this.temMasterViewRepository.findOne({
      where: { accountNumber: cleanedCustomerId },
    });

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

        await this.invoiceRepository.save(invoice);

        this.billGateway.emitUpdate(jobId, {
          status: 'Processing',
          step: 'BillTypeDetermined',
          billType: 'SLB',
          detail: 'Bill determined as Single Location Bill (SLB).',
        });
        await this.eventLogService.logEvent(
          jobId,
          EventType.INFO,
          'Bill type determined as SLB.',
        );
      } else if (temRecord.multipleLocations === 1) {
        // MLB
        invoice.bill_type = 'MLB';
        invoice.audit_flag = true; // MLB not implemented yet
        await this.invoiceRepository.save(invoice);

        this.billGateway.emitUpdate(jobId, {
          status: 'Audit',
          step: 'BillTypeDetermined',
          billType: 'MLB',
          detail:
            'Multi Location Bill detected, flagged for audit (MLB not implemented yet).',
        });
        await this.eventLogService.logEvent(
          jobId,
          EventType.WARNING,
          'MLB detected, invoice flagged for audit.',
        );
      }
    } else {
      // No match found, flag for audit
      invoice.audit_flag = true;
      invoice.bill_type = null;
      await this.invoiceRepository.save(invoice);

      this.billGateway.emitUpdate(jobId, {
        status: 'Audit',
        step: 'FlaggedForAudit',
        detail: 'No TEM record found, invoice flagged for audit.',
      });
      await this.eventLogService.logEvent(
        jobId,
        EventType.WARNING,
        'No TEM record found, invoice flagged for audit.',
      );
    }
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
