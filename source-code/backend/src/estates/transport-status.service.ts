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
  type TransportVersion,
} from '../admin/transport-rules';

/**
 * Reads the transport versions for settlements (Administration-Addendum §4). A month with no
 * monthly charge covering it is "not configured": processing stops for estates that pay
 * transport — it is never deducted as Rs. 0 silently.
 */
@Injectable()
export class TransportStatusService {
  constructor(
    @InjectRepository(TransportRateEntity)
    private readonly rates: Repository<TransportRateEntity>,
  ) {}

  async versions(): Promise<TransportVersion[]> {
    return (await this.rates.find()).map(toTransportVersion);
  }

  /** The status for a 'YYYY-MM' month from versions already read. */
  statusFrom(versions: TransportVersion[], month: string): TransportStatus {
    return transportStatus(versions, month);
  }

  /** The status for a settlement period ('July 2026'); no period = this month. */
  async forPeriod(period: string): Promise<TransportStatus> {
    const key = labelToKey(period) || localDate(new Date()).slice(0, 7);
    return transportStatus(await this.versions(), key);
  }
}
