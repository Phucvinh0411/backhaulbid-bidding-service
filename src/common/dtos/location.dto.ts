import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LocationDetailDto {
  @IsString()
  @IsNotEmpty()
  locationName!: string;

  @IsString()
  @IsNotEmpty()
  province!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  earliestTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  latestTime?: Date;
}
