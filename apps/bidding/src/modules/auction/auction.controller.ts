import {
  Body,
  Controller,
  ForbiddenException,
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
import { FlagAuctionDto } from './dto/flag-auction.dto';
import { SelectWinnerDto } from './dto/select-winner.dto';
import { Query } from '@nestjs/common';

@Controller('auctions')
@ApiBearerAuth(BEARER_AUTH)
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  create(
    @Headers('x-user-id') shipperId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateAuctionDto,
  ) {
    if (!shipperId)
      throw new UnauthorizedException('Authenticated shipper is required');
    requireRole(role, 'SHIPPER');
    return this.auctionService.create(shipperId, dto, idempotencyKey);
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
  update(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') actorId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Body() dto: UpdateAuctionDto,
  ) {
    requireAuthenticated(actorId);
    requireRole(role, 'ADMIN', 'SHIPPER');
    return this.auctionService.update(
      auctionId,
      actorId,
      normalizeRole(role),
      dto,
    );
  }

  @Post(':auctionId/open')
  open(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') actorId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
  ) {
    requireAuthenticated(actorId);
    requireRole(role, 'ADMIN', 'SHIPPER');
    return this.auctionService.open(auctionId, actorId, normalizeRole(role));
  }

  @Post(':auctionId/cancel')
  cancel(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') actorId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
  ) {
    requireAuthenticated(actorId);
    requireRole(role, 'ADMIN', 'SHIPPER');
    return this.auctionService.cancel(auctionId, actorId, normalizeRole(role));
  }

  @Post(':auctionId/fraud-flag')
  flag(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-role') role: string | undefined,
    @Body() dto: FlagAuctionDto,
  ) {
    requireRole(role, 'ADMIN');
    return this.auctionService.flag(auctionId, dto);
  }

  @Post(':auctionId/complete')
  complete(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') actorId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
  ) {
    requireAuthenticated(actorId);
    requireRole(role, 'ADMIN', 'SHIPPER');
    return this.auctionService.complete(
      auctionId,
      actorId,
      normalizeRole(role),
    );
  }

  @Post(':auctionId/winner')
  selectWinner(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') actorId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Body() dto: SelectWinnerDto,
  ) {
    requireAuthenticated(actorId);
    requireRole(role, 'ADMIN', 'SHIPPER');
    return this.auctionService.selectWinner(
      auctionId,
      dto.bidId,
      actorId,
      normalizeRole(role),
    );
  }
}

function normalizeRole(role: string | undefined) {
  return (role || '').toUpperCase();
}

function requireAuthenticated(
  userId: string | undefined,
): asserts userId is string {
  if (!userId)
    throw new UnauthorizedException('Authenticated user is required');
}

function requireRole(role: string | undefined, ...allowed: string[]) {
  if (!allowed.includes(normalizeRole(role))) {
    throw new ForbiddenException(`Required role: ${allowed.join(' or ')}`);
  }
}
