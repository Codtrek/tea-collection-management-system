import { IsIn } from 'class-validator';

/** EMP-10 (approval side) — Officer or Administrator; Manager rejected in the service. */
export class DecideAdvanceDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';
}
