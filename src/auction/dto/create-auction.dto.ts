import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
} from 'class-validator';

export class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  goodsType!: string;

  @IsString()
  @IsNotEmpty()
  vehicleTypeRequired!: string;

  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  weight!: number;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'maxPrice must be a decimal string',
  })
  maxPrice!: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsBoolean()
  isDepositRequired!: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'depositAmount must be a decimal string',
  })
  depositAmount?: string;

  @Type(() => Date)
  @IsDate()
  registrationEndTime!: Date;

  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @Type(() => Date)
  @IsDate()
  endTime!: Date;
}
