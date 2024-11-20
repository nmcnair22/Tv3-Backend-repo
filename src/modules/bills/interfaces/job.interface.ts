// src/modules/bills/interfaces/job.interface.ts

export interface Job {
    id: string;
    filePath: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number; // 0 to 100
    error?: string;
    fingerprint: string;
  }
  