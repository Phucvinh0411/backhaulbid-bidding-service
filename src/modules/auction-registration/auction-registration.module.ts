import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuctionModule } from '../auction/auction.module';
import { WalletModule } from '../../integrations/wallet/wallet.module';
import { AuctionRegistrationController } from './auction-registration.controller';
import { AuctionRegistrationService } from './auction-registration.service';
import {
  AuctionRegistration,
  AuctionRegistrationSchema,
} from './schemas/auction-registration.schema';

@Module({
  imports: [
    AuctionModule,
    WalletModule,
    MongooseModule.forFeature([
      { name: AuctionRegistration.name, schema: AuctionRegistrationSchema },
    ]),
  ],
  controllers: [AuctionRegistrationController],
  providers: [AuctionRegistrationService],
  exports: [AuctionRegistrationService],
})
export class AuctionRegistrationModule {}
