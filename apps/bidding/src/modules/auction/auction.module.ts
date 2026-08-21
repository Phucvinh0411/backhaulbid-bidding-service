import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Auction, AuctionSchema } from './schemas/auction.schema';
import { AuctionRepository } from './auction.repository';

import { Bid, BidSchema } from '../bid/schemas/bid.schema';

import { WalletModule } from '../../integrations/wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auction.name, schema: AuctionSchema },
      { name: Bid.name, schema: BidSchema },
    ]),
    WalletModule,
  ],
  controllers: [AuctionController],
  providers: [AuctionRepository, AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}
