import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BEARER_AUTH } from '../../openapi';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { ListAuctionsQueryDto } from './dto/list-auctions-query.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { Query } from '@nestjs/common';

@Controller('auctions')
@ApiBearerAuth(BEARER_AUTH)
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  create(
    @Headers('x-user-id') shipperId: string | undefined,
    @Body() dto: CreateAuctionDto,
  ) {
    if (!shipperId)
      throw new UnauthorizedException('Authenticated shipper is required');
    return this.auctionService.create(shipperId, dto);
  }

  @Get()
  list(@Query() query: ListAuctionsQueryDto) {
    return this.auctionService.list(query);
  }

  @Get(':auctionId')
  findById(@Param('auctionId') auctionId: string) {
    return this.auctionService.findById(auctionId);
  }

  @Patch(':auctionId')
  update(@Param('auctionId') auctionId: string, @Body() dto: UpdateAuctionDto) {
    return this.auctionService.update(auctionId, dto);
  }

  @Post(':auctionId/open')
  open(@Param('auctionId') auctionId: string) {
    return this.auctionService.open(auctionId);
  }

  @Post(':auctionId/cancel')
  cancel(@Param('auctionId') auctionId: string) {
    return this.auctionService.cancel(auctionId);
  }

  @Post(':auctionId/complete')
  complete(@Param('auctionId') auctionId: string) {
    return this.auctionService.complete(auctionId);
  }
}
