import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateBidDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  truckId: string;

  @IsString()
  @IsNotEmpty()
  companyId: string;
  
  @IsString()
  @IsNotEmpty()
  shipperId: string; // Cần biết shipperId để push event đúng room

  @IsNumber()
  @IsNotEmpty()
  bidPrice: number;

  @IsString()
  @IsOptional()
  message?: string;
}
