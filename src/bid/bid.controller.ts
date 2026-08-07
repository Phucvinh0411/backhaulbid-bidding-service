import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BEARER_AUTH } from '../openapi';
import { BidService } from './bid.service';
import { ListBidsQueryDto } from './dto/list-bids-query.dto';
import { PlaceBidDto } from './dto/place-bid.dto';

@Controller('auctions/:auctionId/bids')
@ApiBearerAuth(BEARER_AUTH)
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post()
  place(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') carrierId: string | undefined,
    @Body() dto: PlaceBidDto,
  ) {
    if (!carrierId)
      throw new UnauthorizedException('Authenticated carrier is required');
    return this.bidService.place(auctionId, carrierId, dto);
  }

  @Get()
  list(
    @Param('auctionId') auctionId: string,
    @Query() query: ListBidsQueryDto,
  ) {
    return this.bidService.list(auctionId, query);
  }
}
