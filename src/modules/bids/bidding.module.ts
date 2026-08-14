import { Module } from '@nestjs/common';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { BiddingGateway } from './bidding.gateway';

@Module({
  controllers: [BiddingController],
  providers: [BiddingService, BiddingGateway],
})
export class BiddingModule {}
