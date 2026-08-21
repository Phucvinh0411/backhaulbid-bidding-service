import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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

export const LocationDetailSchema =
  SchemaFactory.createForClass(LocationDetail);
