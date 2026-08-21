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
    matches.forEach((match) => {
      this.server.to(`company:${match.companyId}`).emit('new_matching_order', {
        message: 'Có một lộ trình mới phù hợp với xe rỗng của bạn!',
        routeId: match.id,
        truckId: match.truckId,
        orderId: auctionData.id || auctionData._id || 'UNKNOWN',
        auction: auctionData,
      });
    });
  }

  onModuleInit() {
    GlobalEventBus.on('auction_created', async (auction) => {
      try {
        const fleetServiceUrl = process.env.FLEET_SERVICE_URL || 'http://backhaulbid-fleet-service:8080';
        const response = await fetch(`${fleetServiceUrl}/internal/empty-routes/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            origin: auction.origin, 
            destination: auction.destination,
            weight: auction.weight,
            latestPickup: auction.pickupLocation?.latestTime,
            vehicleTypeRequired: auction.vehicleTypeRequired
          })
        });
        if (response.ok) {
          const matches = await response.json();
          if (matches && matches.length > 0) {
            this.notifyMatchedCarriers(matches, auction);
          }
        }
      } catch (error) {
        console.error('Failed to match empty routes:', error);
      }
    });
  }
}
