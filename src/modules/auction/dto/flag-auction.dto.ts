import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FlagAuctionDto {
  @ApiProperty({ description: 'The reason for flagging this auction' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
