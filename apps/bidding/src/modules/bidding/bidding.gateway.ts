import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { AuctionRegistrationService } from '../auction-registration/auction-registration.service';
import { AuctionService } from '../auction/auction.service';
import { BidService } from '../bid/bid.service';
import { BiddingEventsService, MONITOR_ROOM } from './bidding-events.service';
import { GlobalEventBus } from '../../common/events';

interface JoinAuctionPayload {
  auctionId?: string;
}

interface RegisterDevicePayload {
  companyId?: string;
  userId?: string;
}

interface PlaceBidPayload {
  auctionId?: string;
  bidAmount?: string;
  idempotencyKey?: string;
}

const BID_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const JOINABLE_ROLES = ['CARRIER', 'ADMIN'];

const readHeader = (
  socket: Socket,
  name: string,
): string | undefined => {
  const raw = socket.handshake.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
};

@WebSocketGateway({
  path: '/bidding-socket',
  cors: { origin: true, credentials: true },
})
export class BiddingGateway implements OnGatewayInit, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly registrationService: AuctionRegistrationService,
    private readonly auctionService: AuctionService,
    private readonly bidService: BidService,
    private readonly eventsService: BiddingEventsService,
  ) {}

  afterInit(server: Server): void {
    this.eventsService.attachServer(server);
  }

  @SubscribeMessage('register_device')
  handleRegisterDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RegisterDevicePayload,
  ) {
    if (payload?.companyId) {
      client.join(`company:${payload.companyId}`);
    }
    return { event: 'device_registered', data: { success: true } };
  }

  @SubscribeMessage('joinAuction')
  async joinAuction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinAuctionPayload,
  ) {
    if (!payload?.auctionId) {
      throw new WsException('auctionId is required');
    }

    const userId = readHeader(socket, 'x-user-id');
    const role = (readHeader(socket, 'x-user-role') || '').toUpperCase();
    if (!userId) {
      throw new WsException('Authenticated user is required');
    }
    if (!JOINABLE_ROLES.includes(role)) {
      throw new WsException('Only carriers or admins can join auction rooms');
    }

    socket.data.userId = userId;
    socket.data.role = role;

    const isAdmin = role === 'ADMIN';
    const access = isAdmin
      ? {
          canRegister: false,
          canEnter: true,
          accessStatus: 'OBSERVER',
          observer: true,
        }
      : await this.registrationService.getAccess(payload.auctionId, userId);
    if (!access.canEnter) {
      throw new WsException(access.accessStatus);
    }

    await socket.join(`auction:${payload.auctionId}`);
    if (isAdmin) {
      await socket.join(MONITOR_ROOM);
    }
    return {
      event: 'joinedAuction',
      data: {
        auctionId: payload.auctionId,
        ...access,
        carrierId: userId,
        serverTime: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('leaveAuction')
  async leaveAuction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinAuctionPayload,
  ) {
    if (payload?.auctionId) {
      await socket.leave(`auction:${payload.auctionId}`);
    }
    return { auctionId: payload?.auctionId ?? null };
  }

  @SubscribeMessage('joinMonitor')
  async joinMonitor(@ConnectedSocket() socket: Socket) {
    const userId = readHeader(socket, 'x-user-id');
    const role = (readHeader(socket, 'x-user-role') || '').toUpperCase();
    if (!userId || role !== 'ADMIN') {
      throw new WsException('Admin access is required');
    }
    socket.data.userId = userId;
    socket.data.role = role;
    await socket.join(MONITOR_ROOM);
    return { serverTime: new Date().toISOString() };
  }

  @SubscribeMessage('placeBid')
  async placeBid(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: PlaceBidPayload,
  ) {
    const carrierId = socket.data.userId as string | undefined;
    const role = socket.data.role as string | undefined;
    if (!payload?.auctionId) {
      return { ok: false, message: 'auctionId is required' };
    }
    if (!carrierId || role !== 'CARRIER') {
      return { ok: false, message: 'Only registered carriers can place bids' };
    }
    const bidAmount = String(payload.bidAmount ?? '');
    if (!BID_AMOUNT_PATTERN.test(bidAmount)) {
      return { ok: false, message: 'bidAmount must be a positive decimal string' };
    }

    try {
      const bid = await this.bidService.place(payload.auctionId, carrierId, {
        bidAmount,
        idempotencyKey: payload.idempotencyKey,
      });
      const auction = await this.auctionService.findById(payload.auctionId);
      this.eventsService.emitBidPlaced(
        payload.auctionId,
        bid as unknown as Parameters<BiddingEventsService['emitBidPlaced']>[1],
        auction.auctionType,
      );
      return { ok: true, bid };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to place bid';
      return { ok: false, message };
    }
  }

  public notifyMatchedCarriers(matches: any[], auctionData: any) {
    for (const match of matches) {
      void (async () => {
        this.server.to(`company:${match.companyId}`).emit('new_matching_order', {
          message: 'Có một lộ trình mới phù hợp với xe rỗng của bạn!',
          routeId: match.id,
          truckId: match.truckId,
          orderId: auctionData.id || auctionData._id || 'UNKNOWN',
          auction: auctionData,
        });

        try {
          const notificationServiceUrl =
            process.env.NOTIFICATION_SERVICE_URL ||
            'http://backhaulbid-notification-service:3002';
          await fetch(`${notificationServiceUrl}/api/v1/notifications/internal/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: match.companyId,
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

