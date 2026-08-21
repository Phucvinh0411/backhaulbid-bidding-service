import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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
