import { Module } from '@nestjs/common';
import { AuctionRegistrationModule } from '../auction-registration/auction-registration.module';
import { BiddingGateway } from './bidding.gateway';

@Module({
  imports: [AuctionRegistrationModule],
  providers: [BiddingGateway],
  exports: [BiddingGateway],
})
export class BiddingModule {}
