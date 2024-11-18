// src/modules/sync/dto/job-data.dto.ts

export interface JobData {
  no: string;
  systemId?: string | null;
  description?: string | null;
  billToCustomerNo?: string | null;
  status?: string | null;
  personResponsible?: string | null;
  nextInvoiceDate?: string | null;
  jobPostingGroup?: string | null;
  searchDescription?: string | null;
  systemCreatedAt?: string | null;
  lastModifiedDateTime?: string | null;
}