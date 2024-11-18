// src/modules/dso/dso.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface DsoMetric {
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  paymentDate: string;
  daysOutstanding: number;
}

@Injectable()
export class DsoService {
  private readonly logger = new Logger(DsoService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Helper to calculate difference in days
  private calculateDaysBetweenDates(invoiceDate: Date, paymentDate: Date): number {
    const differenceInTime = paymentDate.getTime() - invoiceDate.getTime();
    return Math.ceil(differenceInTime / (1000 * 3600 * 24));
  }

  // Function to fetch payments within a date range
  private async getPayments(startDate: string, endDate: string): Promise<{ entry_no: number; document_no: string; posting_date: string }[]> {
    this.logger.log(`Fetching payments between ${startDate} and ${endDate}`);
    const paymentsQuery = `
      SELECT entry_no, document_no, posting_date
      FROM customer_ledger_entry
      WHERE document_type = 'Payment'
        AND posting_date BETWEEN ? AND ?
    `;
    return this.dataSource.query(paymentsQuery, [startDate, endDate]);
  }

  // Function to fetch invoices related to given payment entry numbers
  private async getInvoices(paymentEntryNos: number[]): Promise<{ entry_no: number; document_no: string; closed_by_entry_no: number }[]> {
    if (paymentEntryNos.length === 0) return [];

    this.logger.log(`Fetching invoices for payment entryNos=${paymentEntryNos.join(', ')}`);
    // Construct dynamic placeholders
    const placeholders = paymentEntryNos.map(() => '?').join(', ');
    const invoicesQuery = `
      SELECT entry_no, document_no, closed_by_entry_no
      FROM customer_ledger_entry
      WHERE document_type = 'Invoice'
        AND closed_by_entry_no IN (${placeholders})
    `;
    return this.dataSource.query(invoicesQuery, paymentEntryNos);
  }

  // Function to fetch sales invoices based on document_no only (ignoring api_source)
  private async getSalesInvoices(documentNos: string[]): Promise<{ number: string; customer_name: string; invoice_date: string; posting_date: string }[]> {
    if (documentNos.length === 0) return [];

    // Trim and ensure uniqueness
    const trimmedDocumentNos = documentNos.map(no => no.trim());
    const uniqueDocumentNos = Array.from(new Set(trimmedDocumentNos));

    this.logger.log(`Fetching SalesInvoices for documentNos=${uniqueDocumentNos.join(', ')}`);

    // Construct dynamic placeholders
    const placeholders = uniqueDocumentNos.map(() => '?').join(', ');
    const salesInvoicesQuery = `
      SELECT number, customer_name, invoice_date, posting_date
      FROM sales_invoice
      WHERE number IN (${placeholders})
    `;
    return this.dataSource.query(salesInvoicesQuery, uniqueDocumentNos);
  }

  // Main function to calculate DSO
  async calculateDSO(startDate: string, endDate: string): Promise<DsoMetric[]> {
    try {
      const payments = await this.getPayments(startDate, endDate);
      this.logger.log(`Fetched ${payments.length} payments`);

      if (payments.length === 0) {
        this.logger.warn('No payments found for the given date range.');
        return [];
      }

      // Create a map of payment_entry_no to payment_posting_date
      const paymentMap = new Map<number, string>();
      payments.forEach(payment => {
        paymentMap.set(payment.entry_no, payment.posting_date);
      });

      const paymentEntryNos = payments.map(payment => payment.entry_no);
      const invoices = await this.getInvoices(paymentEntryNos);
      this.logger.log(`Found ${invoices.length} invoices related to payments`);

      if (invoices.length === 0) {
        this.logger.warn('No invoices found related to the fetched payments.');
        return [];
      }

      // Extract unique document_no values
      const uniqueDocumentNos = Array.from(new Set(invoices.map(inv => inv.document_no.trim())));

      this.logger.log(`Unique document_nos to process: ${uniqueDocumentNos.join(', ')}`);

      const salesInvoices = await this.getSalesInvoices(uniqueDocumentNos);
      this.logger.log(`Fetched ${salesInvoices.length} SalesInvoices`);

      // Log fetched sales_invoice numbers for debugging
      const fetchedSalesInvoiceNumbers = salesInvoices.map(si => si.number.trim());
      this.logger.log(`Fetched SalesInvoice numbers: ${fetchedSalesInvoiceNumbers.join(', ')}`);

      // Create a map for quick lookup based on trimmed number
      const salesInvoiceMap = new Map<string, { number: string; customer_name: string; invoice_date: string; posting_date: string }>();
      salesInvoices.forEach(si => {
        salesInvoiceMap.set(si.number.trim(), si);
      });

      const dsoMetrics: DsoMetric[] = [];

      invoices.forEach(invoice => {
        const documentNo = invoice.document_no.trim();
        const salesInvoice = salesInvoiceMap.get(documentNo);
        if (!salesInvoice) {
          this.logger.warn(`SalesInvoice not found for documentNo=${documentNo}`);
          return; // Skip if no matching salesInvoice
        }

        // Get the corresponding payment's posting_date
        const paymentPostingDateStr = paymentMap.get(invoice.closed_by_entry_no);
        if (!paymentPostingDateStr) {
          this.logger.warn(`Payment posting_date not found for closed_by_entry_no=${invoice.closed_by_entry_no}`);
          return;
        }

        const invoiceDate = new Date(salesInvoice.invoice_date);
        const paymentDate = new Date(paymentPostingDateStr);

        if (isNaN(invoiceDate.getTime()) || isNaN(paymentDate.getTime())) {
          this.logger.warn(`Invalid dates for invoiceNo=${salesInvoice.number}`);
          return; // Skip invalid dates
        }

        const daysOutstanding = this.calculateDaysBetweenDates(invoiceDate, paymentDate);
        this.logger.log(`Calculated daysOutstanding=${daysOutstanding} for invoiceNo=${salesInvoice.number}`);

        dsoMetrics.push({
          invoiceNumber: salesInvoice.number,
          customerName: salesInvoice.customer_name || 'Unknown',
          invoiceDate: invoiceDate.toISOString().split('T')[0],
          paymentDate: paymentDate.toISOString().split('T')[0],
          daysOutstanding,
        });
      });

      this.logger.log(`Total DSO Metrics collected: ${dsoMetrics.length}`);
      return dsoMetrics;
    } catch (error) {
      this.logger.error('Error calculating DSO:', error);
      throw error;
    }
  }

  // Function to get company-wide DSO
  async getCompanyWideDSO(startDate: string, endDate: string): Promise<{ dso: number }> {
    const dsoMetrics = await this.calculateDSO(startDate, endDate);
    const totalDSO = dsoMetrics.reduce((sum, metric) => sum + metric.daysOutstanding, 0);
    const averageDSO = dsoMetrics.length ? totalDSO / dsoMetrics.length : 0;
    this.logger.log(`Calculated Company-Wide DSO: ${averageDSO}`);
    return { dso: averageDSO };
  }

  // Function to get per-customer DSO
  async getPerCustomerDSO(startDate: string, endDate: string): Promise<{ customerName: string; averageDSO: number }[]> {
    const dsoMetrics = await this.calculateDSO(startDate, endDate);
    const customerDSOMap = new Map<string, { totalDSO: number; count: number }>();

    dsoMetrics.forEach((metric) => {
      if (!customerDSOMap.has(metric.customerName)) {
        customerDSOMap.set(metric.customerName, { totalDSO: 0, count: 0 });
      }

      const customerData = customerDSOMap.get(metric.customerName);
      customerData.totalDSO += metric.daysOutstanding;
      customerData.count += 1;
    });

    const perCustomerDSO = Array.from(customerDSOMap.entries()).map(
      ([customerName, data]) => ({
        customerName,
        averageDSO: data.count ? data.totalDSO / data.count : 0,
      }),
    );

    this.logger.log(`Per-Customer DSO: ${JSON.stringify(perCustomerDSO)}`);
    return perCustomerDSO;
  }
}
