import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catch-up: `salary_advances_installment_months_check` was added to init.sql with the
 * repayment plans (Salary-Advances-Addendum §10) but never to a migration file, so databases
 * built from migrations lacked it. Found by comparing a migrated schema with init.sql.
 */
export class SalaryAdvanceInstallmentMonthsCheck1794400010500 implements MigrationInterface {
  name = 'SalaryAdvanceInstallmentMonthsCheck1794400010500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE salary_advances DROP CONSTRAINT IF EXISTS salary_advances_installment_months_check`,
    );
    await queryRunner.query(
      `ALTER TABLE salary_advances ADD CONSTRAINT salary_advances_installment_months_check CHECK (installment_months IS NULL OR installment_months >= 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE salary_advances DROP CONSTRAINT IF EXISTS salary_advances_installment_months_check`,
    );
  }
}
