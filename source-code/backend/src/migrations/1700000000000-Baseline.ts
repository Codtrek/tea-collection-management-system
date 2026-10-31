import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

export class Baseline1700000000000 implements MigrationInterface {
  name = 'Baseline1700000000000';
  public async up(q: QueryRunner) {
    await q.query(readFileSync(join(__dirname, 'baseline.sql'), 'utf8'));
  }
  public async down() {
    throw new Error('Baseline cannot be reverted');
  }
}