import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { localDate } from '../dispatch/dispatch-map';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { labelToKey } from '../reports/reports-map';
import { type Actor, cancelledOf, refuse, SETUP_HREF } from './admin.service';
import type { PublicTransportRate } from './admin-map';
import { CreateTransportChargeDto } from './dto/create-grade-rate.dto';
import { TransportRateEntity } from './transport-rate.entity';
import {
  firstChargedMonth,
  monthLabel,
  toTransportVersion,
  transportStatus,
  type TransportStatus,
} from './transport-rules';
import {
  cancelError,
  liveVersions,
  newVersionError,
  versionBefore,
  versionStatus,
} from './versioning';

export interface TransportRatesView {
  versions: PublicTransportRate[];
  /** this month's status */
  status: TransportStatus;
  /**
   * While no monthly charge has ever been published, the first one may start from this month
   * ('YYYY-MM', the earliest month with unprocessed settlements); null once one exists, or when
   * no settlement is waiting.
   */
  firstVersionFrom: string | null;
  /** the earliest month a normal (not back-dated) version can start from */
  nextMonth: string;
}

export interface TransportPreview {
  /** 'YYYY-MM' — last complete month */
  month: string;
  /** estates that delivered at least once that month and don't deliver themselves */
  estates: number;
  total: number;
  /** self-delivery estates that delivered that month (exempt) */
  exempt: number;
}

const addMonth = (key: string, n: number) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const money = (n: number) => `Rs. ${n.toLocaleString('en-US')}`;

/**
 * ADM-01 Transport — one versioned "monthly transport charge per estate"
 * (Administration-Addendum §4). Versions follow `versioning.ts`; the one exception: while none
 * has ever been published, the FIRST may start in a past month (no earlier than the earliest
 * month with unprocessed settlements), so the settlements already waiting can be processed.
 */
@Injectable()
export class TransportRatesService {
  constructor(
    @InjectRepository(TransportRateEntity)
    private readonly rates: Repository<TransportRateEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlements: Repository<SettlementEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly deliveries: Repository<CollectionRecordEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    private readonly audit: AuditService,
  ) {}

  async list(now: Date = new Date()): Promise<TransportRatesView> {
    const rows = await this.rates.find({ order: { effectiveDate: 'DESC' } });
    const today = localDate(now);
    return {
      versions: rows.map((r) => ({
        id: r.id,
        effectiveDate: r.effectiveDate,
        firstMonth: firstChargedMonth(r.effectiveDate),
        basis: r.basis,
        rate: Number(r.rate),
        minimumCharge: Number(r.minimumCharge),
        basisConfirmed: r.basisConfirmed,
        neverApplied: r.neverApplied,
        backdated:
          r.basis === 'fixed_month' &&
          r.effectiveDate < localDate(new Date(r.createdAt)),
        setBy: r.setBy,
        reason: r.reason,
        status: versionStatus(r, rows, today),
        cancelled: cancelledOf(r),
      })),
      status: transportStatus(rows.map(toTransportVersion), today.slice(0, 7)),
      firstVersionFrom: await this.firstVersionFrom(rows),
      nextMonth: firstChargedMonth(today),
    };
  }

  /** "Last month this would have charged N estates, total Rs Y." */
  async preview(
    amount: number,
    now: Date = new Date(),
  ): Promise<TransportPreview> {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException(
        'Give the monthly charge as Rs. 0 or more.',
      );
    }
    const month = addMonth(localDate(now).slice(0, 7), -1);
    const selfDelivery = new Set(
      (await this.estates.find())
        .filter((e) => e.selfDelivery)
        .map((e) => e.id),
    );
    const delivered = new Set(
      (await this.deliveries.find({ where: { status: 'confirmed' } }))
        .filter(
          (d) =>
            d.estateId != null &&
            String(d.collectionDate).slice(0, 7) === month,
        )
        .map((d) => d.estateId as number),
    );
    const charged = [...delivered].filter((id) => !selfDelivery.has(id));
    return {
      month,
      estates: charged.length,
      total: Math.round(charged.length * amount * 100) / 100,
      exempt: delivered.size - charged.length,
    };
  }

  async create(
    dto: CreateTransportChargeDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<TransportRatesView> {
    this.assertIsAdmin(actor);
    const rows = await this.rates.find();
    const today = localDate(now);
    const effectiveDate = `${dto.effectiveMonth}-01`;
    const firstFrom = await this.firstVersionFrom(rows);
    const backdated = effectiveDate < today;
    if (backdated && firstFrom) {
      if (dto.effectiveMonth < firstFrom) {
        throw new BadRequestException(
          `The first monthly charge can start no earlier than ${monthLabel(firstFrom)}, the earliest month with settlements still to process. Earlier months are already settled.`,
        );
      }
    }
    refuse(
      newVersionError(
        rows,
        effectiveDate,
        // the one exception: the first version may start in a past month
        backdated && firstFrom ? effectiveDate : today,
        (v) => v.basis === 'fixed_month' && Number(v.rate) === dto.amount,
        'transport charge',
        dto.reason,
      ),
    );
    const before = versionBefore(
      liveVersions(rows).filter((r) => r.basis === 'fixed_month'),
      effectiveDate,
    );
    await this.rates.save(
      this.rates.create({
        effectiveDate,
        basis: 'fixed_month',
        rate: String(dto.amount),
        minimumCharge: '0',
        basisConfirmed: true,
        neverApplied: false,
        reason: dto.reason.trim(),
        setBy: actor.name,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
      }),
    );
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Updated transport charge',
        module: 'Administration',
        record: `Transport from ${monthLabel(dto.effectiveMonth)}`,
        recordHref: SETUP_HREF,
        details: `Monthly transport charge per estate ${before ? `${money(Number(before.rate))} → ` : ''}${money(dto.amount)} from ${monthLabel(dto.effectiveMonth)}${backdated ? ' (first version, back-dated)' : ''} — ${dto.reason.trim()}`,
      },
    );
    return this.list(now);
  }

  async cancel(
    id: number,
    reason: string,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<TransportRatesView> {
    this.assertIsAdmin(actor);
    const row = await this.rates.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Transport version ${id} not found.`);
    }
    const why = cancelError(row, localDate(now), reason);
    if (why) throw new BadRequestException(why);
    row.cancelledAt = now;
    row.cancelledBy = actor.name;
    row.cancelReason = reason.trim();
    await this.rates.save(row);
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Cancelled scheduled transport charge',
        module: 'Administration',
        record: `Transport from ${monthLabel(firstChargedMonth(row.effectiveDate))}`,
        recordHref: SETUP_HREF,
        details: `${money(Number(row.rate))} per estate per month — ${reason.trim()}`,
      },
    );
    return this.list(now);
  }

  /**
   * The earliest month the first version may start from, or null when the exception is spent: the
   * earliest month still to settle — a pending draft's month, or the month after the latest
   * processed settlement. Legacy (seed) rows are never processed, so they don't count either way.
   */
  private async firstVersionFrom(
    rows: TransportRateEntity[],
  ): Promise<string | null> {
    if (liveVersions(rows).some((r) => r.basis === 'fixed_month')) return null;
    const all = await this.settlements.find();
    const monthsOf = (status: string) =>
      all
        .filter((s) => s.status === status)
        .map((s) => labelToKey(s.period))
        .filter(Boolean)
        .sort();
    const lastProcessed = monthsOf('processed').at(-1);
    const candidates = [
      ...monthsOf('pending'),
      ...(lastProcessed ? [firstChargedMonth(`${lastProcessed}-02`)] : []),
    ].sort();
    return candidates[0] ?? null;
  }

  private assertIsAdmin(actor: Actor): void {
    if (actor.role !== 'Administrator') {
      throw new ForbiddenException(
        'Only an Administrator can change the transport charge.',
      );
    }
  }
}
