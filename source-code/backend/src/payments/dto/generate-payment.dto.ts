import { IsInt, IsNumber, IsOptional, Matches } from 'class-validator';

export class GeneratePaymentDto {
  @IsInt()
  ownerId: number;

  @IsInt()
  factoryId: number;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  paymentMonth: string;

  @IsNumber()
  superRatePerKg: number;

  @IsNumber()
  normalRatePerKg: number;

  @IsOptional()
  @IsNumber()
  transportRatePerKg?: number;

  @IsOptional()
  @IsNumber()
  fertilizerDeductions?: number;

  @IsOptional()
  @IsNumber()
  advanceDeductions?: number;

  @IsOptional()
  @IsNumber()
  bankTransferFee?: number;
}
