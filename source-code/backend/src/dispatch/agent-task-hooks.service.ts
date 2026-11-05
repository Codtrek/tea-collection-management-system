import { Injectable, Logger } from '@nestjs/common';

/** A non-tea task on an estate stop (today: a fertilizer delivery), merged by estate + date. */
export interface ExtraStopTask {
  kind: 'fertilizer';
  estateId: number;
  estateName: string;
  routeId: number;
  routeName: string;
  date: string;
  covering: boolean;
  deliveryId: number;
  requestId: string;
  item: string;
  qtyKg: number;
  status: string;
  stage: 'awaiting_handover' | 'carrying';
}

type StopContributor = (
  agentId: number,
  date: string,
  now: Date,
) => Promise<ExtraStopTask[]>;
type ShiftListener = (
  agentId: number,
  date: string,
  now: Date,
) => Promise<void>;

/**
 * Lets other modules hang work off the agent's day without DispatchModule importing them
 * (Fertilizer imports Dispatch, so the reverse would be a cycle). Fertilizer registers a
 * stop contributor (its deliveries become flags on the agent's stops) and a shift listener
 * (starting the route puts picked-up fertilizer "Out for delivery").
 */
@Injectable()
export class AgentTaskHooks {
  private readonly logger = new Logger(AgentTaskHooks.name);
  private readonly contributors: StopContributor[] = [];
  private readonly shiftListeners: ShiftListener[] = [];

  registerStopContributor(fn: StopContributor): void {
    this.contributors.push(fn);
  }

  onShiftStarted(fn: ShiftListener): void {
    this.shiftListeners.push(fn);
  }

  async extraStops(
    agentId: number,
    date: string,
    now: Date,
  ): Promise<ExtraStopTask[]> {
    const out: ExtraStopTask[] = [];
    for (const fn of this.contributors)
      out.push(...(await fn(agentId, date, now)));
    return out;
  }

  /** Best-effort: a listener failing must never stop the agent starting his shift. */
  async shiftStarted(agentId: number, date: string, now: Date): Promise<void> {
    for (const fn of this.shiftListeners) {
      try {
        await fn(agentId, date, now);
      } catch (err) {
        this.logger.error(
          `Shift-start listener failed for agent ${agentId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
