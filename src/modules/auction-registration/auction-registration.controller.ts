import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BEARER_AUTH } from '../../openapi';
import { AuctionRegistrationService } from './auction-registration.service';
import { RegisterAuctionDto } from './dto/register-auction.dto';
import { RetryPaymentDto } from './dto/retry-payment.dto';

@Controller('auctions/:auctionId/registrations')
@ApiBearerAuth(BEARER_AUTH)
export class AuctionRegistrationController {
  constructor(
    private readonly registrationService: AuctionRegistrationService,
  ) {}

  @Post()
  register(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') carrierId: string | undefined,
    @Body() dto: RegisterAuctionDto,
  ) {
    if (!carrierId)
      throw new UnauthorizedException('Authenticated carrier is required');
    return this.registrationService.register(auctionId, carrierId, dto);
  }

  @Get('access')
  access(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') carrierId: string | undefined,
  ) {
    if (!carrierId)
      throw new UnauthorizedException('Authenticated carrier is required');
    return this.registrationService.getAccess(auctionId, carrierId);
  }

  @Post(':registrationId/retry-payment')
  retryPayment(
    @Param('auctionId') auctionId: string,
    @Param('registrationId') registrationId: string,
    @Headers('x-user-id') carrierId: string | undefined,
    @Body() dto: RetryPaymentDto,
  ) {
    if (!carrierId)
      throw new UnauthorizedException('Authenticated carrier is required');
    return this.registrationService.retryPayment(
      auctionId,
      registrationId,
      carrierId,
      dto,
    );
  }

  @Delete(':registrationId')
  cancel(
    @Param('auctionId') auctionId: string,
    @Param('registrationId') registrationId: string,
    @Headers('x-user-id') carrierId: string | undefined,
  ) {
    if (!carrierId)
      throw new UnauthorizedException('Authenticated carrier is required');
    return this.registrationService.cancel(
      auctionId,
      registrationId,
      carrierId,
    );
  }
}
