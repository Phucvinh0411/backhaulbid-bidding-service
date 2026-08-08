import { Module } from '@nestjs/common';
import { WalletClient } from './wallet.client';

@Module({
  providers: [WalletClient],
  exports: [WalletClient],
})
export class WalletModule {}
