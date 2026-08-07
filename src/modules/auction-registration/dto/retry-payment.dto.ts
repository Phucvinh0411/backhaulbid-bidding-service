import { IsString, MinLength } from 'class-validator';

export class RetryPaymentDto {
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
