import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseEntryEntity } from './expense-entry.entity';
import { formatExpenseId, type PublicExpenseEntry } from './reports-map';

export interface Actor {
  name: string;
  role: AppRole;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ExpenseEntryEntity)
    private readonly expenseRepo: Repository<ExpenseEntryEntity>,
    private readonly audit: AuditService,
  ) {}

  // RPT-01 — Collection lives in CollectionReportService (collection-report-rules.ts).

  // RPT-02 — the Leaf Purchase Report lives in LeafPurchaseService (leaf-purchase-rules.ts).

  // RPT-03 — the Expense report lives in FinanceService (finance-rules.ts): leaf purchases, wages,
  // fertilizer stock and daily entries are expenses; settlement deductions are recoveries and
  // advances are loans (Finance-Reports-Addendum). This service owns the daily entries (RPT-04).

  /** RPT-04 — Officer+ (Manager is read-only, same tier as every other module). */
  async createExpense(
    dto: CreateExpenseDto,
    actor: Actor,
  ): Promise<PublicExpenseEntry> {
    this.assertCanWrite(actor);
    const year = new Date(dto.date).getFullYear();
    const seq = (await this.expenseRepo.count()) + 1;
    const entry = this.expenseRepo.create({
      id: formatExpenseId(year, seq),
      category: dto.category,
      description: dto.description,
      amount: String(dto.amount),
      entryDate: dto.date,
      enteredBy: actor.name,
    });
    const saved = await this.expenseRepo.save(entry);
    await this.audit.record(actor, {
      action: 'Logged daily expense',
      module: 'Reports',
      record: saved.id,
      recordHref: '/reports/expenses',
      details: `${dto.category} · Rs. ${dto.amount} — ${dto.description}`,
    });
    return this.toPublicExpense(saved);
  }

  private assertCanWrite(actor: Actor): void {
    if (actor.role === 'Manager') {
      throw new ForbiddenException(
        'Managers have read-only access to this resource.',
      );
    }
  }

  private toPublicExpense(entity: ExpenseEntryEntity): PublicExpenseEntry {
    return {
      id: entity.id,
      category: entity.category,
      description: entity.description,
      amount: Number(entity.amount),
      date: entity.entryDate,
      enteredBy: entity.enteredBy,
      source: 'Manual',
    };
  }
}
