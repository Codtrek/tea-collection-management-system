import {
  IsDateString,
  IsIn,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Reschedule request + decision are the salary-advance DTOs — same shape, same rules.
export {
  DecideRescheduleDto,
  RescheduleAdvanceDto,
} from '../../employees/dto/advance-change.dto';

/** An early repayment, in cash or by bank transfer, recorded by an officer (§4). */
export class EstateRepaymentDto {
  @IsIn(['cash', 'bank'])
  kind: 'cash' | 'bank';

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  paidOn: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reference: string;
}
