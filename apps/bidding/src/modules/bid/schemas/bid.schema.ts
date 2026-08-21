import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';

export type BidDocument = HydratedDocument<Bid>;

@Schema({ collection: 'bids', versionKey: false })
export class Bid {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true, index: true })
  auctionId!: string;

  @Prop({ type: String, required: true, index: true })
  carrierId!: string;

  @Prop({ type: MongooseSchema.Types.Decimal128, required: true })
  bidAmount!: Types.Decimal128;

  @Prop({ type: Date, default: Date.now, index: true })
  bidTime!: Date;
}

export const BidSchema = SchemaFactory.createForClass(Bid);
BidSchema.index({ auctionId: 1, bidTime: -1 });
BidSchema.index({ auctionId: 1, bidAmount: 1 });
BidSchema.index({ auctionId: 1, carrierId: 1 });
