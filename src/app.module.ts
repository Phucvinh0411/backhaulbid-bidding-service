import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuctionModule } from './auction/auction.module';
import { BidModule } from './bid/bid.module';
import { BiddingGateway } from './bidding/bidding.gateway';

@Module({
  imports: [AuctionModule, BidModule],
  controllers: [AppController],
  providers: [AppService, BiddingGateway],
})
export class AppModule {}
