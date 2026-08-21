import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';

export class CreateBidDto {
  @IsNotEmpty({ message: 'orderId không được để trống' })
  @IsString({ message: 'orderId phải là chuỗi' })
  orderId: string;

  @IsNotEmpty({ message: 'truckId không được để trống' })
  @IsString({ message: 'truckId phải là chuỗi' })
  truckId: string;

  @IsNotEmpty({ message: 'companyId không được để trống' })
  @IsString({ message: 'companyId phải là chuỗi' })
  companyId: string;

  @IsNotEmpty({ message: 'bidPrice không được để trống' })
  @IsNumber({}, { message: 'bidPrice phải là số' })
  @IsPositive({ message: 'bidPrice phải lớn hơn 0' })
  bidPrice: number;

  @IsOptional()
  @IsString({ message: 'message phải là chuỗi' })
  message?: string;
}
