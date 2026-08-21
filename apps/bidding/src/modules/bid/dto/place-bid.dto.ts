import { IsString, Matches } from 'class-validator';

export class PlaceBidDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'bidAmount must be a decimal string',
  })
  bidAmount!: string;
}
