import { Module } from '@nestjs/common';
import { BiddingEventsService } from './bidding-events.service';

@Module({
  providers: [BiddingEventsService],
  exports: [BiddingEventsService],
})
export class BiddingEventsModule {}
