import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuctionModule } from './auction/auction.module';
import { AuctionRegistrationModule } from './auction-registration/auction-registration.module';
import { BidModule } from './bid/bid.module';
import { BiddingModule } from './bidding/bidding.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    AuctionModule,
    AuctionRegistrationModule,
    BidModule,
    BiddingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
