import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { AuctionRegistrationService } from '../auction-registration/auction-registration.service';

interface JoinAuctionPayload {
  auctionId?: string;
}

interface BiddingSocket {
  handshake: {
    headers: Record<string, string | string[] | undefined>;
  };
  join(room: string): Promise<void>;
}

@WebSocketGateway({
  path: '/bidding-socket',
  cors: { origin: true, credentials: true },
})
export class BiddingGateway {
  constructor(
    private readonly registrationService: AuctionRegistrationService,
  ) {}

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

    await client.join(`auction:${payload.auctionId}`);
    return {
      event: 'joinedAuction',
      data: { auctionId: payload.auctionId, ...access },
    };
  }

  @SubscribeMessage('message')
  handleMessage(): string {
    return 'Hello world!';
  }
}
