import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

// Import types
import { GLEntry } from 'src/common/types/gl-entry.types'; // Assuming we have a type definition for GL entries

@Injectable()
export class DynamicsGlEntryService extends DynamicsBaseService {
  protected readonly logger = new Logger(DynamicsGlEntryService.name);

/**
 * Fetches GL entries for multiple invoices and returns a map of invoiceNumber -> { accountNumber -> totalAmount }
 * @param invoiceNumbers - Array of invoice numbers to look up
 * @returns A record mapping each invoice number to its associated account numbers and summed amounts
 */
async getGLEntriesForInvoices(invoiceNumbers: string[]): Promise<Record<string, Record<string, number>>> {
  const accountByInvoice: Record<string, Record<string, number>> = {};

  for (const invoiceNumber of invoiceNumbers) {
    const encodedInvoiceNumber = encodeURIComponent(invoiceNumber);
    const url = `/generalLedgerEntries`;
    const params: Record<string, string> = {
      $filter: `documentNumber eq '${encodedInvoiceNumber}' and creditAmount gt 0`,
      $select: 'documentNumber,accountNumber,creditAmount',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ value: GLEntry[] }>(`${this.standardApiUrl}${url}`, {
          headers: await this.getHeaders(),
          params,
        })
      );

      if (response.data.value.length > 0) {
        // Initialize the invoice entry in the map if it doesn't exist
        if (!accountByInvoice[invoiceNumber]) {
          accountByInvoice[invoiceNumber] = {};
        }

        // Loop through the GL entries and group by accountNumber
        response.data.value.forEach((glEntry) => {
          const accountNumber = glEntry.accountNumber;
          const creditAmount = glEntry.creditAmount;

          // Aggregate the credit amounts per account number
          if (!accountByInvoice[invoiceNumber][accountNumber]) {
            accountByInvoice[invoiceNumber][accountNumber] = 0;
          }

          accountByInvoice[invoiceNumber][accountNumber] += creditAmount;
        });
      } else {
        this.logger.warn(`No GL entry found for invoice number: ${invoiceNumber}`);
      }
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch GL entries for invoice number ${invoiceNumber}`, error);
      throw new HttpException(
        `Failed to fetch GL entries for invoice number ${invoiceNumber}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  return accountByInvoice;
}

 /**
   * Fetches GL entries by document number using the v2.0 API.
   * @param documentNumber - The document number to filter GL entries.
   * @returns Array of GLEntry objects.
   */
 async getGLEntriesByDocumentNumber(documentNumber: string): Promise<GLEntry[]> {
  this.logger.debug(`Fetching GL entries for document number: ${documentNumber}`);

  // Step 1: Commenting out the encoding and passing the document number as-is.
  // const encodedDocumentNumber = encodeURIComponent(documentNumber); <-- Commenting this line
  const encodedDocumentNumber = documentNumber; // Pass the raw document number

  const url = `/generalLedgerEntries`;

  // Step 2: Building query parameters
  const params: Record<string, string> = {
    $filter: `documentNumber eq '${encodedDocumentNumber}' and creditAmount gt 0`,
    $select: 'documentNumber,postingDate,description,creditAmount,debitAmount,accountNumber',
  };

  const config: AxiosRequestConfig = {
    headers: await this.getHeaders(),
    params,
  };

  // Step 3: Log the final Axios request object to see what's being sent

  // Step 4: Construct the query URL with parameters and log it (for further inspection)
  const queryUrl = `${this.standardApiUrl}${url}?$filter=${encodeURIComponent(params.$filter)}&$select=${params.$select}`;
  this.logger.debug(`Constructed API call: ${queryUrl}`);

  try {
    // Step 5: Making the request and logging raw response data
    const response = await firstValueFrom(
      this.httpService.get<{ value: GLEntry[] }>(`${this.standardApiUrl}${url}`, config)
    );

    // Log the raw response data before processing
    this.logger.debug(`Raw response data: ${JSON.stringify(response.data)}`);

    // Step 6: Processing the response
    const glEntries = response.data.value;
    this.logger.debug(`Fetched ${glEntries.length} GL entries for document number: ${documentNumber}`);
    return glEntries;
  } catch (error) {
    const err = error as any;
    // Step 7: Error handling
    this.logger.error(`Failed to fetch GL entries for document number ${documentNumber}: ${err.message}`);
    throw new HttpException(
      `Failed to fetch GL entries for document number ${documentNumber}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
 /**
/**
 * Fetches TEM payments from G/L entries for account 23090 within a date range.
 * @param startDate - The start date in 'YYYY-MM-DD' format.
 * @param endDate - The end date in 'YYYY-MM-DD' format.
 * @returns An array of GLEntry objects representing TEM payments.
 */
async getTEMPayments(startDate: string, endDate: string): Promise<GLEntry[]> {
  this.logger.debug(`Fetching TEM payments for account 23090 from ${startDate} to ${endDate}`);

  const url = `/generalLedgerEntries`;
  const params: Record<string, string> = {
    $filter: `accountNumber eq '23090' and postingDate ge ${startDate} and postingDate le ${endDate}`,
    $select: 'documentNumber,postingDate,description,creditAmount',
  };

  const config: AxiosRequestConfig = {
    headers: await this.getHeaders(),
    params,
  };

  try {
    const response = await firstValueFrom(
      this.httpService.get<{ value: GLEntry[] }>(`${this.standardApiUrl}${url}`, config)
    );

    this.logger.debug(`Fetched TEM payments: ${JSON.stringify(response.data.value)}`);
    return response.data.value;
  } catch (error) {
    const err = error as any;
    this.logger.error(`Failed to fetch TEM payments: ${err.message}`);
    throw new HttpException('Failed to fetch TEM payments', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

}