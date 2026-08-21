import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationDocument } from './schemas/notification.schema.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/notification-socket',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // Map to store connected clients: userId -> Set<SocketId>
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove socket from tracking
    this.userSockets.forEach((sockets, userId) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    });
  }

  @SubscribeMessage('identify')
  handleIdentify(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data && data.userId) {
      this.logger.log(`Socket ${client.id} identified as user ${data.userId}`);
      if (!this.userSockets.has(data.userId)) {
        this.userSockets.set(data.userId, new Set());
      }
      this.userSockets.get(data.userId)?.add(client.id);

      // Also join a room for this user for easy broadcasting
      client.join(data.userId);

      return { status: 'success', message: 'Identified successfully' };
    }
    return { status: 'error', message: 'Missing userId' };
  }

  public notifyUser(userId: string, notification: NotificationDocument) {
    this.logger.log(`Sending real-time notification to user ${userId}`);
    this.server.to(userId).emit('new_notification', notification);
  }

  public notifyAll(notification: NotificationDocument) {
    this.logger.log(`Broadcasting real-time notification to all users`);
    this.server.emit('new_notification', notification);
  }
}
