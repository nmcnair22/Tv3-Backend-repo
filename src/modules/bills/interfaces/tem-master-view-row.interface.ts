// src/modules/bills/interfaces/tem-master-view-row.interface.ts

import { RowDataPacket } from 'mysql2/promise';

export interface TemMasterViewRow extends RowDataPacket {
  id: number;
  id_vendor: string;
  id_location: number;
  id_provider: string;
  id_customer: string;
  accountNumber: string;
  expectedAmount: number;
  username: string;
  password: string;
  url: string;
  billType: string;
  payType: string;
  multipleLocations: number;
  created_at: Date;
  updated_at: Date;
  customerName: string;
  locationName: string;
  vendorName: string;
  vendorBalance: number;
  providerName: string;
  status: number;
  flagged: number;
  flaggedReason: string;
  nameOnCheck: string;
  address1: string;
  address2: string | null;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressValidated: number | null;
  lastInvoice: Date;
  lastAmount: number;
}
