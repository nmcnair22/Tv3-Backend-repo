// src/modules/bills/bill.gateway.ts

import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust based on your frontend's origin
  },
})
export class BillGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BillGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
  }

  handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emits status update events to clients.
   * @param jobId - The ID of the job.
   * @param data - The status update data.
   */
  emitUpdate(jobId: string, data: any) {
    this.server.emit(`update-${jobId}`, data);
    this.logger.debug(
      `Emitted update for jobId ${jobId}: ${JSON.stringify(data)}`,
    );
  }

  /**
   * Emits error events to clients.
   * @param jobId - The ID of the job.
   * @param error - The error message.
   */
  emitError(jobId: string, error: string) {
    this.server.emit(`error-${jobId}`, { error });
    this.logger.error(`Emitted error for jobId ${jobId}: ${error}`);
  }

  /**
   * Emits general events to clients.
   * @param event - The event name.
   * @param data - The data to emit.
   */
  emitEvent(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Emitted event ${event}: ${JSON.stringify(data)}`);
  }
}
