import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterAuctionDto {
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
