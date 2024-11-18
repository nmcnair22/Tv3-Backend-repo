// src/modules/bills/bill.gateway.ts

import { Injectable, Logger } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust as needed for security
  },
})
@Injectable()
export class BillGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BillGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emits update events to all connected clients.
   * @param jobId The ID of the job.
   * @param data The update data.
   */
  emitUpdate(jobId: string, data: Record<string, unknown>) {
    this.server.emit('update', { jobId, ...data });
  }

  /**
   * Emits error events to all connected clients.
   * @param jobId The ID of the job.
   * @param message The error message.
   */
  emitError(jobId: string, message: string) {
    this.server.emit('error', { jobId, message });
  }
}
