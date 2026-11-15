import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportRateEntity } from '../admin/transport-rate.entity';
import { localDate } from '../dispatch/dispatch-map';
import { labelToKey } from '../reports/reports-map';
import {
  toTransportVersion,
  transportStatus,
  type TransportStatus,
} from '../admin/transport-rules';

/**
 * Whether transport can be charged on a date (Administration-Addendum §4). Settlement processing
 * asks before deducting anything: until the factory confirms its method and the formula exists,
 * the answer is "not configured" and processing stops — transport is never deducted as Rs. 0
 * silently.
 */
@Injectable()
export class TransportStatusService {
  constructor(
    @InjectRepository(TransportRateEntity)
    private readonly rates: Repository<TransportRateEntity>,
  ) {}

  /** The status on the last day of a settlement period ('July 2026'). */
  async forPeriod(period: string): Promise<TransportStatus> {
    const key = labelToKey(period);
    if (!key) return this.status(localDate(new Date()));
    const [y, m] = key.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return this.status(last);
  }

  async status(date: string): Promise<TransportStatus> {
    return transportStatus(
      (await this.rates.find()).map(toTransportVersion),
      date,
    );
  }
}
