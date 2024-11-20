// src/modules/bills/bill.gateway.ts

import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust based on your frontend's origin
  },
})
export class BillGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BillGateway.name);

  handleConnection(client: any, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emits update events to clients.
   * @param jobId - The ID of the job.
   * @param data - The update data.
   */
  emitUpdate(jobId: string, data: any) {
    this.server.emit(`update-${jobId}`, data);
  }

  /**
   * Emits error events to clients.
   * @param jobId - The ID of the job.
   * @param error - The error message.
   */
  emitError(jobId: string, error: string) {
    this.server.emit(`error-${jobId}`, { error });
  }
}
