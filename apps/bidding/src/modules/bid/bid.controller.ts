import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BEARER_AUTH } from '../../openapi';
import { BidService } from './bid.service';
import { AuctionService } from '../auction/auction.service';
import { BiddingEventsService } from '../bidding/bidding-events.service';
import { ListBidsQueryDto } from './dto/list-bids-query.dto';
import { PlaceBidDto } from './dto/place-bid.dto';

@Controller('auctions/:auctionId/bids')
@ApiBearerAuth(BEARER_AUTH)
export class BidController {
  constructor(
    private readonly bidService: BidService,
    private readonly auctionService: AuctionService,
    private readonly eventsService: BiddingEventsService,
  ) {}

  @Post()
  async place(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') carrierId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Body() dto: PlaceBidDto,
  ) {
    if (!carrierId)
      throw new UnauthorizedException('Authenticated carrier is required');
    if ((role || '').toUpperCase() !== 'CARRIER')
      throw new ForbiddenException('Only carriers can place bids');
    const bid = await this.bidService.place(auctionId, carrierId, dto);
    const auction = await this.auctionService.findById(auctionId);
    this.eventsService.emitBidPlaced(auctionId, bid, auction.auctionType);
    return bid;
  }

  @Get()
  list(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') viewerId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Query() query: ListBidsQueryDto,
  ) {
    if (!viewerId) throw new UnauthorizedException('Authenticated user is required');
    const normalizedRole = (role || '').toUpperCase();
    if (!['ADMIN', 'CARRIER', 'SHIPPER'].includes(normalizedRole)) {
      throw new ForbiddenException('Unsupported bidding role');
    }
    return this.bidService.list(auctionId, viewerId, normalizedRole, query);
  }
}
