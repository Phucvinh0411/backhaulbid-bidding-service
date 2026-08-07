import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { AuctionStatus } from '../../common/enums/auction-status.enum';
import { ParticipationFeeTier } from '../fee-policy';

export type AuctionDocument = HydratedDocument<Auction>;

@Schema({ collection: 'auctions', timestamps: true, versionKey: false })
export class Auction {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true, index: true })
  shipperId!: string;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: true, trim: true })
  goodsType!: string;

  @Prop({ type: String, required: true, trim: true })
  vehicleTypeRequired!: string;

  @Prop({ type: String, required: true, trim: true })
  origin!: string;

  @Prop({ type: String, required: true, trim: true })
  destination!: string;

  @Prop({ type: Number, required: true, min: 0 })
  weight!: number;

  @Prop({ type: MongooseSchema.Types.Decimal128, required: true })
  maxPrice!: Types.Decimal128;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: String, default: null })
  notes!: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  isDepositRequired!: boolean;

  @Prop({ type: MongooseSchema.Types.Decimal128, default: null })
  depositAmount!: Types.Decimal128 | null;

  @Prop({ type: String, enum: ParticipationFeeTier, required: true })
  participationFeeTier!: ParticipationFeeTier;

  @Prop({ type: MongooseSchema.Types.Decimal128, required: true })
  participationFeeAmount!: Types.Decimal128;

  @Prop({ type: Date, required: true })
  registrationEndTime!: Date;

  @Prop({ type: Date, required: true, index: true })
  startTime!: Date;

  @Prop({ type: Date, required: true, index: true })
  endTime!: Date;

  @Prop({
    type: String,
    enum: AuctionStatus,
    default: AuctionStatus.PENDING,
    index: true,
  })
  status!: AuctionStatus;

  @Prop({ type: String, default: null })
  winningBidId!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AuctionSchema = SchemaFactory.createForClass(Auction);
AuctionSchema.index({ shipperId: 1, createdAt: -1 });
AuctionSchema.index({ status: 1, startTime: 1 });
AuctionSchema.index({ status: 1, endTime: 1 });
