import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { addMonths, differenceInDays } from 'date-fns';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { TemAccount } from '../entities/tem-account.entity';
import { TemBill } from '../entities/tem-bill.entity';

@Injectable()
export class MissingBillsService {
  private readonly logger = new Logger(MissingBillsService.name);
  private gracePeriodDays = 10; // This can be made configurable from a settings table if needed

  constructor(
    @InjectRepository(TemAccount)
    private readonly accountRepository: Repository<TemAccount>,

    @InjectRepository(TemBill)
    private readonly billRepository: Repository<TemBill>,

    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Runs the logic to check all active accounts if they are missing bills,
   * and flags/unflags them as needed.
   */
  async runMissingBillsCheck(): Promise<void> {
    this.logger.log('Running missing bills check...');

    // Fetch all active accounts with vendor, customer, and location for metadata purposes
    const accounts = await this.accountRepository.find({
      where: { is_active: true },
      relations: ['vendor', 'customer', 'location'],
    });
    this.logger.log(`Found ${accounts.length} active accounts to check.`);

    for (const account of accounts) {
      const lastBill = await this.getLastBillForAccount(account.id);

      if (!lastBill) {
        // No bills found
        this.logger.debug(
          `No bills found for Account ${account.account_number}. Skipping...`,
        );
        continue;
      }

      this.logger.debug(
        `Account ${account.account_number}: Last bill due date = ${lastBill.due_date}`,
      );

      const lastDueDate = new Date(lastBill.due_date);
      const nextExpectedDueDate = addMonths(lastDueDate, 1);
      const daysUntilNext = differenceInDays(nextExpectedDueDate, new Date());

      this.logger.debug(
        `Account ${account.account_number}: nextExpectedDueDate = ${nextExpectedDueDate.toISOString().split('T')[0]}, daysUntilNext = ${daysUntilNext}`,
      );

      if (!account.missing_bill_flag) {
        // Not currently missing
        if (daysUntilNext <= this.gracePeriodDays) {
          this.logger.debug(
            `Account ${account.account_number}: daysUntilNext (${daysUntilNext}) <= gracePeriodDays (${this.gracePeriodDays}), flagging as missing`,
          );
          await this.flagAccountAsMissing(account, lastBill);
        } else {
          this.logger.debug(
            `Account ${account.account_number}: daysUntilNext (${daysUntilNext}) > gracePeriodDays (${this.gracePeriodDays}), not missing`,
          );
        }
      } else {
        // Currently flagged as missing
        if (daysUntilNext > this.gracePeriodDays) {
          this.logger.debug(
            `Account ${account.account_number}: was missing, now daysUntilNext (${daysUntilNext}) > gracePeriodDays (${this.gracePeriodDays}), unflagging`,
          );
          await this.unflagAccountAsMissing(account, lastBill);
        } else {
          this.logger.debug(
            `Account ${account.account_number}: still missing, daysUntilNext (${daysUntilNext}) <= gracePeriodDays (${this.gracePeriodDays})`,
          );
        }
      }
    }

    this.logger.log('Missing bills check completed.');
  }

  /**
   * Cron job: run the missing bills check every night at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runMissingBillsCheckCron() {
    this.logger.log('Running missing bills check via nightly cron job...');
    await this.runMissingBillsCheck();
  }

  private async getLastBillForAccount(
    accountId: number,
  ): Promise<TemBill | null> {
    return this.billRepository
      .createQueryBuilder('b')
      .where('b.account_id = :accountId', { accountId })
      .orderBy('b.due_date', 'DESC')
      .getOne();
  }

  private async flagAccountAsMissing(account: TemAccount, lastBill: TemBill) {
    if (!account.missing_bill_flag) {
      account.missing_bill_flag = true;
      await this.accountRepository.save(account);

      const vendorName = account.vendor
        ? account.vendor.name
        : 'Unknown Vendor';
      const customerName = account.customer
        ? account.customer.name
        : 'Unknown Customer';
      const locationName = account.location
        ? account.location.name
        : 'Unknown Location';

      const message = `Account ${account.account_number} is missing a bill. Last bill due: ${lastBill.due_date}`;
      await this.notificationRepository.save({
        account: account,
        notification_module: 'bills',
        notification_type: 'MissingBill',
        message,
        metadata: {
          vendorName,
          customerName,
          locationName,
          lastBillDueDate: lastBill.due_date,
        },
      });

      this.logger.warn(
        `Account ${account.account_number} flagged as missing a bill.`,
      );
    }
  }

  private async unflagAccountAsMissing(account: TemAccount, lastBill: TemBill) {
    if (account.missing_bill_flag) {
      account.missing_bill_flag = false;
      await this.accountRepository.save(account);

      const vendorName = account.vendor
        ? account.vendor.name
        : 'Unknown Vendor';
      const customerName = account.customer
        ? account.customer.name
        : 'Unknown Customer';
      const locationName = account.location
        ? account.location.name
        : 'Unknown Location';

      const message = `Account ${account.account_number} is no longer missing a bill.`;
      await this.notificationRepository.save({
        account: account,
        notification_module: 'bills',
        notification_type: 'MissingBillResolved',
        message,
        metadata: {
          vendorName,
          customerName,
          locationName,
          lastBillDueDate: lastBill.due_date,
        },
      });

      this.logger.log(
        `Account ${account.account_number} unflagged (bill now found).`,
      );
    }
  }

  /**
   * Get all accounts that currently have `missing_bill_flag = 1`.
   * For each account, include vendor, customer, location, and last bill details.
   * Add `missingBillDueIn` to show how many days until the next expected due date.
   * Also include vendor contact info, location address, and other account details.
   */
  async getMissingAccountsWithDetails(): Promise<any[]> {
    const accounts = await this.accountRepository.find({
      where: { missing_bill_flag: true },
      relations: ['vendor', 'customer', 'location', 'bills'],
    });

    const results = [];
    for (const account of accounts) {
      // Sort bills by due_date DESC to get the last bill
      const lastBill = account.bills.sort((a, b) =>
        a.due_date > b.due_date ? -1 : 1,
      )[0];

      const vendorName = account.vendor
        ? account.vendor.name
        : 'Unknown Vendor';
      const vendorShortName = account.vendor ? account.vendor.short_name : null;
      const vendorNameOnCheck = account.vendor
        ? account.vendor.name_on_check
        : null;
      const vendorAddress = account.vendor ? account.vendor.address : null;
      const vendorPhone = account.vendor ? account.vendor.phone : null;
      const vendorEmail = account.vendor ? account.vendor.email : null;

      const customerName = account.customer
        ? account.customer.name
        : 'Unknown Customer';
      const locationName = account.location
        ? account.location.name
        : 'Unknown Location';
      const locationAddress = account.location
        ? account.location.address
        : null;

      const lastBillDueDate = lastBill ? lastBill.due_date : null;
      const lastInvoiceDate = lastBill ? lastBill.invoice_date : null;
      // Prefer invoice_total if available, else amount_due
      const lastInvoiceAmount = lastBill
        ? lastBill.invoice_total != null
          ? lastBill.invoice_total
          : lastBill.amount_due
        : null;
      const billNotes = lastBill ? lastBill.notes : null;

      const expectedAmount = account.expected_amount;
      const payType = account.pay_type;
      const description = account.description;
      const lastInvoiceDateFromAccount = account.last_invoice;
      const lastAmountFromAccount = account.last_amount;

      // Calculate missingBillDueIn
      let missingBillDueIn = null;
      if (lastBillDueDate) {
        const nextExpectedDueDate = addMonths(new Date(lastBillDueDate), 1);
        missingBillDueIn = differenceInDays(nextExpectedDueDate, new Date());
      }

      const record = {
        accountId: account.id,
        accountNumber: account.account_number,
        customerName,
        locationName,
        vendorName,
        lastBillDueDate,
        lastInvoiceDate,
        lastInvoiceAmount:
          lastInvoiceAmount != null ? lastInvoiceAmount.toString() : null,
        missingBillDueIn,

        // Detailed / expansion info
        vendorShortName,
        vendorNameOnCheck,
        vendorAddress,
        vendorPhone,
        vendorEmail,

        locationAddress,

        expectedAmount:
          expectedAmount != null ? expectedAmount.toString() : null,
        payType,
        notes: description,
        lastInvoiceDateFromAccount: lastInvoiceDateFromAccount
          ? lastInvoiceDateFromAccount.toString()
          : null,
        lastAmountFromAccount:
          lastAmountFromAccount != null
            ? lastAmountFromAccount.toString()
            : null,

        billNotes,
      };

      results.push(record);
    }

    return results;
  }
}
