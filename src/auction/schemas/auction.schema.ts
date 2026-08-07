import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { AuctionStatus } from '../../common/enums/auction-status.enum';
import { AuctionType } from '../../common/enums/auction-type.enum';
import { ParticipationFeeTier } from '../fee-policy';

export type AuctionDocument = HydratedDocument<Auction>;

@Schema({ _id: false })
export class LocationDetail {
  @Prop({ type: String, required: true, trim: true })
  locationName!: string;

  @Prop({ type: String, required: true, trim: true })
  province!: string;

  @Prop({ type: String, required: true, trim: true })
  address!: string;

  @Prop({ type: String, trim: true })
  contactName?: string;

  @Prop({ type: String, trim: true })
  contactPhone?: string;

  @Prop({ type: Date })
  earliestTime?: Date;

  @Prop({ type: Date })
  latestTime?: Date;
}
export const LocationDetailSchema = SchemaFactory.createForClass(LocationDetail);

@Schema({ _id: false })
export class VehicleSpecs {
  @Prop({ type: Number })
  length?: number;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;
}
export const VehicleSpecsSchema = SchemaFactory.createForClass(VehicleSpecs);

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

  @Prop({ type: Number, required: true, min: 0 })
  weight!: number;

  @Prop({ type: Number, min: 0 })
  volume?: number;

  @Prop({ type: MongooseSchema.Types.Decimal128 })
  goodsValue?: Types.Decimal128;

  @Prop({ type: String, required: true, trim: true })
  vehicleTypeRequired!: string;

  @Prop({ type: String, trim: true })
  requiredTemp?: string;

  @Prop({ type: VehicleSpecsSchema })
  vehicleSpecs?: VehicleSpecs;

  // Origin/Destination kept for backward compatibility or simple queries, but enriched via sub-documents
  @Prop({ type: String, required: true, trim: true })
  origin!: string;

  @Prop({ type: String, required: true, trim: true })
  destination!: string;

  @Prop({ type: LocationDetailSchema, required: true })
  pickupLocation!: LocationDetail;

  @Prop({ type: LocationDetailSchema, required: true })
  deliveryLocation!: LocationDetail;

  @Prop({ type: String, enum: AuctionType, default: AuctionType.PUBLIC })
  auctionType!: AuctionType;

  @Prop({ type: MongooseSchema.Types.Decimal128, required: true })
  maxPrice!: Types.Decimal128;

  @Prop({ type: MongooseSchema.Types.Decimal128, required: true })
  priceStep!: Types.Decimal128;

  @Prop({ type: Number })
  maxBids?: number;

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
