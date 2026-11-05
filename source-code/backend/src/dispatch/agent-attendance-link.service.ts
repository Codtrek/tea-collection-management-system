import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { AgentDayStatusEntity } from './agent-day-status.entity';
import { CollectionAgentEntity } from './collection-agent.entity';

/** Reasons that mark an `agent_day_status` row as written FROM attendance (so a later Present can lift it). */
export const ATTENDANCE_ABSENT = 'Attendance: Absent';
export const ATTENDANCE_LEAVE = 'Attendance: On leave';

/**
 * Attendance ↔ Agent Dispatch — ONE record, two views (Attendance-Leave-Addendum Phase 1).
 * `employee_attendance` is the record; `agent_day_status` is the dispatch board's view of it
 * (plus shift times). Marking an agent Absent / on leave in attendance makes him ABSENT on the
 * board (and out of the cover candidates); marking him absent on the board writes the
 * attendance row. Agents link to their HR record through `collection_agents.hr_employee_id`.
 */
@Injectable()
export class AgentAttendanceLink {
  constructor(
    @InjectRepository(EmployeeAttendanceEntity)
    private readonly attendance: Repository<EmployeeAttendanceEntity>,
    @InjectRepository(AgentDayStatusEntity)
    private readonly dayStatus: Repository<AgentDayStatusEntity>,
    @InjectRepository(CollectionAgentEntity)
    private readonly agents: Repository<CollectionAgentEntity>,
  ) {}

  async agentIdFor(employeeId: number): Promise<number | null> {
    const a = (await this.agents.find()).find(
      (x) => x.hrEmployeeId === employeeId,
    );
    return a?.id ?? null;
  }

  async employeeIdFor(agentId: number): Promise<number | null> {
    const a = await this.agents.findOne({ where: { id: agentId } });
    return a?.hrEmployeeId ?? null;
  }

  /**
   * Attendance → dispatch view. Absent / Leave → ABSENT; anything else lifts an ABSENT that
   * attendance put there (never one an officer set on the board for another reason).
   * Returns the agent id when the dispatch view changed to ABSENT (the caller hands back covers).
   */
  async mirrorToDispatch(
    employeeId: number,
    date: string,
    status: EmployeeAttendanceEntity['status'] | null,
    markedBy: string,
  ): Promise<{ agentId: number; absent: boolean } | null> {
    const agentId = await this.agentIdFor(employeeId);
    if (agentId === null) return null;
    const row = await this.dayStatus.findOne({ where: { agentId, day: date } });
    const absent = status === 'Absent' || status === 'Leave';
    if (absent) {
      await this.dayStatus.save(
        Object.assign(
          row ??
            this.dayStatus.create({
              agentId,
              day: date,
              shiftStartedAt: null,
              shiftEndedAt: null,
            }),
          {
            status: 'ABSENT' as const,
            source: 'officer' as const,
            reason: status === 'Leave' ? ATTENDANCE_LEAVE : ATTENDANCE_ABSENT,
            markedBy,
          },
        ),
      );
      return { agentId, absent: true };
    }
    if (
      row &&
      row.status === 'ABSENT' &&
      row.reason?.startsWith('Attendance:')
    ) {
      row.status = 'AVAILABLE';
      row.source = null;
      row.reason = null;
      row.markedBy = markedBy;
      await this.dayStatus.save(row);
    }
    return { agentId, absent: false };
  }

  /**
   * Dispatch → attendance. The board's "absent" writes an Absent attendance row (approved leave
   * stays leave); "available again" removes an Absent the board itself wrote.
   */
  async recordFromDispatch(
    agentId: number,
    date: string,
    status: 'ABSENT' | 'AVAILABLE',
    reason: string | null,
    markedBy: string,
  ): Promise<void> {
    const employeeId = await this.employeeIdFor(agentId);
    if (employeeId === null) return;
    const row = await this.attendance.findOne({ where: { employeeId, date } });
    if (status === 'ABSENT') {
      if (row?.status === 'Leave') return;
      await this.attendance.save(
        Object.assign(
          row ??
            this.attendance.create({
              employeeId,
              date,
              half: null,
              shortOut: null,
              shortBack: null,
              holidayWorked: false,
              leaveRequestId: null,
            }),
          {
            status: 'Absent' as const,
            dayHours: '0',
            dayOtHours: '0',
            nightHours: '0',
            nightOtHours: '0',
            markedBy,
            markedAt: new Date(),
            editReason: reason,
            source: 'dispatch' as const,
          },
        ),
      );
      return;
    }
    if (row && row.status === 'Absent' && row.source === 'dispatch') {
      await this.attendance.delete({ id: row.id });
    }
  }
}
