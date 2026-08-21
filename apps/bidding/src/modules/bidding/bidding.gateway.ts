import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuctionRegistrationService } from '../auction-registration/auction-registration.service';
import { GlobalEventBus } from '../../common/events';

interface JoinAuctionPayload {
  auctionId?: string;
}

interface RegisterDevicePayload {
  companyId?: string;
  userId?: string;
}

interface BiddingSocket {
  id: string;
  handshake: {
    headers: Record<string, string | string[] | undefined>;
  };
  join(room: string | string[]): Promise<void> | void;
}

@WebSocketGateway({
  path: '/bidding-socket',
  cors: { origin: true, credentials: true },
})
export class BiddingGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly registrationService: AuctionRegistrationService,
  ) {}

  @SubscribeMessage('register_device')
  handleRegisterDevice(
    @ConnectedSocket() client: BiddingSocket,
    @MessageBody() payload: RegisterDevicePayload,
  ) {
    if (payload?.companyId) {
      client.join(`company:${payload.companyId}`);
    }
    return { event: 'device_registered', data: { success: true } };
  }

  @SubscribeMessage('joinAuction')
  async joinAuction(
    @ConnectedSocket() client: BiddingSocket,
    @MessageBody() payload: JoinAuctionPayload,
  ) {
    if (!payload?.auctionId) {
      throw new WsException('auctionId is required');
    }

    const rawCarrierId = client.handshake.headers['x-user-id'];
    const carrierId = Array.isArray(rawCarrierId)
      ? rawCarrierId[0]
      : rawCarrierId;
    if (!carrierId) {
      throw new WsException('Authenticated carrier is required');
    }

    const access = await this.registrationService.getAccess(
      payload.auctionId,
      carrierId,
    );
    if (!access.canEnter) {
      throw new WsException(access.accessStatus);
    }

    client.join(`auction:${payload.auctionId}`);
    return {
      event: 'joinedAuction',
      data: { auctionId: payload.auctionId, ...access },
    };
  }

  public notifyMatchedCarriers(matches: any[], auctionData: any) {
    for (const match of matches) {
      void (async () => {
        // 1. Emit direct socket for those who might listen to bidding-socket (optional backward compatibility)
        this.server.to(`company:${match.companyId}`).emit('new_matching_order', {
          message: 'Có một lộ trình mới phù hợp với xe rỗng của bạn!',
          routeId: match.id,
          truckId: match.truckId,
          orderId: auctionData.id || auctionData._id || 'UNKNOWN',
          auction: auctionData,
        });

        // 2. Call Notification Service to store and broadcast to NotificationSocket
        try {
          const notificationServiceUrl =
            process.env.NOTIFICATION_SERVICE_URL ||
            'http://backhaulbid-notification-service:3002';
          await fetch(`${notificationServiceUrl}/api/v1/notifications/internal/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: match.companyId, // Use companyId so the Carrier UI (using effectiveId) receives it
              title: auctionData.title || auctionData.goodsName || 'Lô hàng mới',
              message: 'Hệ thống vừa tìm thấy 1 lộ trình phù hợp với xe rỗng của bạn!',
              referenceId: auctionData.id || auctionData._id || 'UNKNOWN',
              type: 'NEW_AUCTION'
            })
          });
        } catch (err) {
          console.error('Failed to create internal notification', err);
        }
      })();
    }
  }

  onModuleInit() {
    GlobalEventBus.on('auction_created', (auction) => {
      void (async () => {
        try {
          const fleetServiceUrl =
            process.env.FLEET_SERVICE_URL ||
            'http://backhaulbid-fleet-service:8080';
          const response = await fetch(
            `${fleetServiceUrl}/internal/empty-routes/match`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                origin: auction.origin,
                destination: auction.destination,
                weight: auction.weight,
                latestPickup: auction.pickupLocation?.latestTime,
                vehicleTypeRequired: auction.vehicleTypeRequired,
              }),
            },
          );
          if (response.ok) {
            const matches = await response.json();
            if (matches && matches.length > 0) {
              this.notifyMatchedCarriers(matches, auction);
            }
          }
        } catch (error) {
          console.error('Failed to match empty routes:', error);
        }
      })();
    });
  }
}
