import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

/**
 * EMP-02 registration. Format/shape mirrors the portal's `employeeSchema`
 * exactly (NIC regex, phone regex, flat bank fields). The two cross-field
 * rules the zod schema enforces client-side — age ≥ 18, hire date not in
 * the future — are re-checked server-side in `EmployeesService.create`
 * rather than as DTO decorators, since they depend on "now", not just shape.
 */
export class CreateEmployeeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @Matches(/^(\d{12}|\d{9}[vVxX])$/, { message: 'Enter a valid NIC number' })
  nic: string;

  @IsDateString()
  dob: string;

  @Matches(/^(?:\+94|0)\d{9}$/, { message: 'Enter a valid contact number' })
  contact: string;

  @IsString()
  @MinLength(1)
  address: string;

  @IsString()
  @MinLength(1)
  role: string;

  @IsString()
  @MinLength(1)
  department: string;

  @IsDateString()
  hireDate: string;

  @IsIn(['Permanent', 'Contract', 'Casual'])
  employmentType: 'Permanent' | 'Contract' | 'Casual';

  @IsString()
  @MinLength(1)
  bank: string;

  @IsString()
  @MinLength(1)
  branch: string;

  @Matches(/^\d+$/, { message: 'Account number must be numeric' })
  account: string;

  @IsBoolean()
  hasLogin: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dayRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dayOtRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nightRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nightOtRate?: number;
}
