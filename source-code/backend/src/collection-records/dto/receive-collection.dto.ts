import { IsIn, IsNumber } from 'class-validator';

import type { TeaGrade } from '../collection-status.util';

export class ReceiveCollectionDto {
  @IsNumber()
  receivedWeightKg: number;

  @IsIn(['super', 'normal'])
  teaGrade: TeaGrade;
}
