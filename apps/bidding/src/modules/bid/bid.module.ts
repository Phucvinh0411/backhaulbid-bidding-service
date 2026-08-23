import { Module } from '@nestjs/common';
import { BidController } from './bid.controller';
import { BidService } from './bid.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Bid, BidSchema } from './schemas/bid.schema';
import { AuctionModule } from '../auction/auction.module';
import { AuctionRegistrationModule } from '../auction-registration/auction-registration.module';
import { BiddingEventsModule } from '../bidding/bidding-events.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bid.name, schema: BidSchema }]),
    AuctionModule,
    AuctionRegistrationModule,
    BiddingEventsModule,
  ],
  controllers: [BidController],
  providers: [BidService],
  exports: [BidService],
})
export class BidModule {}
