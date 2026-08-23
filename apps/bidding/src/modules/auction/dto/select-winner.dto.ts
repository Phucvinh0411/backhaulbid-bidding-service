import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectWinnerDto {
  @ApiProperty({ description: 'The winning bid id' })
  @IsString()
  @IsNotEmpty()
  bidId: string;
}
