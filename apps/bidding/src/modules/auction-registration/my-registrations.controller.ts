import {
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BEARER_AUTH } from '../../openapi';
import { AuctionRegistrationService } from './auction-registration.service';
import { ListMyRegistrationsQueryDto } from './dto/list-my-registrations-query.dto';

@Controller('my-registrations')
@ApiBearerAuth(BEARER_AUTH)
export class MyRegistrationsController {
  constructor(
    private readonly auctionRegistrationService: AuctionRegistrationService,
  ) {}

  @Get()
  list(
    @Headers('x-user-id') carrierId: string | undefined,
    @Query() query: ListMyRegistrationsQueryDto,
  ) {
    if (!carrierId)
      throw new UnauthorizedException('Authenticated carrier is required');
    return this.auctionRegistrationService.listMine(carrierId, query);
  }
}
