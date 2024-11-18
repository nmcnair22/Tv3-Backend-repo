// src/modules/bills/workers/bill.worker.ts

import { NestFactory } from '@nestjs/core';
import { parentPort, workerData } from 'worker_threads';
import { BillsModule } from '../bills.module';
import { BillsService } from '../bills.service';

(async () => {
  try {
    // Create a NestJS application context within the worker thread
    const app = await NestFactory.createApplicationContext(BillsModule, {
      logger: false, // Disable logging in worker threads
    });

    const billsService = app.get(BillsService);

    // Execute the bill analysis
    const result = await billsService.analyzeBill(workerData.filePath);

    // Send the result back to the main thread
    parentPort.postMessage({ status: 'completed', result });
  } catch (error: unknown) {
    // Send the error back to the main thread
    parentPort.postMessage({ status: 'failed', error: (error as Error).message });
  } finally {
    // Close the NestJS application context
    // Note: It's important to ensure that the app closes even if an error occurs
    const app = await NestFactory.createApplicationContext(BillsModule, {
      logger: false,
    });
    await app.close();
  }
})();
