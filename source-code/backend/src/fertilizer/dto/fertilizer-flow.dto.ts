import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { FailReason, PaymentMethod } from '../fertilizer-map';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS: PaymentMethod[] = ['deduct', 'cash', 'bank'];
const FAIL_REASONS: FailReason[] = [
  'owner_not_available',
  'road_not_passable',
  'owner_refused',
  'wrong_estate',
  'other',
];

/* ── Portal (officer / manager / administrator) ── */

export class RequestItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  item: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;
}

/**
 * FERT-07 — one phoned-in order: one request per item, all sharing an order reference.
 * The route comes from the estate; the client never sends it.
 */
export class CreateRequestsDto {
  /** 'EST-0001' */
  @IsString()
  @MinLength(1)
  estateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RequestItemDto)
  items: RequestItemDto[];

  @IsIn(METHODS)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** FERT-06 — the Factory Officer's decision. Partial approval and rejection need a reason. */
export class DecideRequestDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  approvedQtyKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

/** The Factory Manager's second sign-off above the quantity limit. */
export class ManagerDecideDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ReasonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason: string;
}

export class ChangeDeliveryDateDto {
  @Matches(ISO_DATE, { message: 'date must be YYYY-MM-DD.' })
  date: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason: string;
}

export class QuantityDto {
  @IsNumber()
  @IsPositive()
  qtyKg: number;
}

export class RetryDto {
  @IsOptional()
  @Matches(ISO_DATE, { message: 'date must be YYYY-MM-DD.' })
  date?: string;
}

export class PaymentMethodDto {
  @IsIn(METHODS)
  method: PaymentMethod;
}

export class RecordPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @Matches(ISO_DATE, { message: 'paidOn must be YYYY-MM-DD.' })
  paidOn: string;

  @IsIn(['cash', 'bank'])
  method: 'cash' | 'bank';

  /** required for a bank transfer */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}

export class SetPriceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  item: string;

  @IsNumber()
  @Min(0)
  ratePerKg: number;

  @Matches(ISO_DATE, { message: 'effectiveDate must be YYYY-MM-DD.' })
  effectiveDate: string;
}

/* ── Agent (mobile, own tasks only) ── */

export class DeliveryPhotoDto {
  /** device time the photo was taken */
  @IsISO8601()
  takenAt: string;

  /** set once the photo is uploaded (Cloudinary is deferred, like Collections' photos) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}

class SyncedActionDto {
  /** device clock (ISO) — kept through offline sync */
  @IsISO8601()
  recordedAt: string;

  /** generated on the device; a re-sent action with the same key is applied once */
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  syncKey: string;
}

export class AgentPickupDto extends SyncedActionDto {
  @IsNumber()
  @IsPositive()
  qtyKg: number;
}

export class AgentDeliveredDto extends SyncedActionDto {
  @IsNumber()
  @IsPositive()
  deliveredQtyKg: number;

  /** the owner types or says his name on the agent's phone… */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ownerName: string;

  /** …and taps Confirm (same on-device confirmation as tea collection) */
  @IsBoolean()
  @Equals(true, { message: 'The owner must confirm receipt.' })
  ownerConfirmed: boolean;

  @ValidateNested()
  @Type(() => DeliveryPhotoDto)
  photo: DeliveryPhotoDto;

  /** required when less than the agent carried is delivered */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortfallReason?: string;
}

export class AgentFailedDto extends SyncedActionDto {
  @IsIn(FAIL_REASONS)
  reason: FailReason;

  /** required when the reason is "other" */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryPhotoDto)
  photo?: DeliveryPhotoDto;
}
