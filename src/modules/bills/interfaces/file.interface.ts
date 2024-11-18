// src/modules/bills/interfaces/file.interface.ts

import { Express } from 'express';

export interface UploadedFileInterface extends Express.Multer.File {
  customProperty?: string;
}