import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { AuctionType } from '../../common/enums/auction-type.enum';

export interface BroadcastBid {
  id: string;
  auctionId: string;
  carrierId: string;
  bidAmount: string;
  bidTime: Date;
}

export interface AuctionStatusPayload {
  auctionId: string;
  status: string;
  roomOpen: boolean;
  endTime: Date;
  winningBidAmount?: string | null;
}

export const MONITOR_ROOM = 'auctions:monitor';
const auctionRoom = (auctionId: string) => `auction:${auctionId}`;

/**
 * Fan-out point for realtime auction events. The socket.io Server instance is
 * attached by BiddingGateway at bootstrap; emitters no-op until it exists so
 * unit tests and REST-only boots stay safe.
 */
@Injectable()
export class BiddingEventsService {
  private server: Server | null = null;

  attachServer(server: Server): void {
    this.server = server;
  }

  emitBidPlaced(
    auctionId: string,
    bid: BroadcastBid,
    auctionType: AuctionType | string,
  ): void {
    if (!this.server) return;
    const payload =
      auctionType === (AuctionType.SEALED as string)
        ? { auctionId, sealed: true }
        : { auctionId, bid };
    this.server.to(auctionRoom(auctionId)).emit('bidPlaced', payload);
    this.server.to(MONITOR_ROOM).emit('bidPlaced', payload);
  }

  emitAuctionStatusChanged(payload: AuctionStatusPayload): void {
    if (!this.server) return;
    this.server
      .to(auctionRoom(payload.auctionId))
      .emit('auctionStatusChanged', payload);
    this.server.to(MONITOR_ROOM).emit('auctionStatusChanged', payload);
  }
}
