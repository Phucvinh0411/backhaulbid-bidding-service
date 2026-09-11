import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAuctionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}