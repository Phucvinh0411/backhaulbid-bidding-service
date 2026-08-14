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

@WebSocketGateway({
  cors: {
    origin: '*', // Trong thực tế nên config domain cụ thể
  },
})
export class BiddingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BiddingGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Lắng nghe event từ Frontend (Shipper Dashboard) để join vào Room của Shipper đó
   */
  @SubscribeMessage('join_shipper_room')
  handleJoinShipperRoom(
    @MessageBody() data: { shipperId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `room_shipper_${data.shipperId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room: ${roomName}`);
    return { event: 'joined_room', data: roomName };
  }

  /**
   * Hàm này được Service gọi (Inject Gateway) để bắn thông báo cho Shipper
   */
  notifyNewBid(shipperId: string, bidData: any) {
    const roomName = `room_shipper_${shipperId}`;
    this.server.to(roomName).emit('new_bid_received', bidData);
    this.logger.log(`Emitted new_bid_received to ${roomName}`);
  }
}
