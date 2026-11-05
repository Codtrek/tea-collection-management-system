
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeaCollectionRequestTables1793030191149
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tea_collection_requests (
        id SERIAL PRIMARY KEY,

        estate_id INTEGER NOT NULL,
        requested_by_user_id INTEGER,
        created_by_user_id INTEGER NOT NULL,

        source VARCHAR(40) NOT NULL,
        requested_weight_kg NUMERIC(10, 2) NOT NULL,
        requested_collection_date DATE NOT NULL,
        notes TEXT,

        status VARCHAR(20) NOT NULL DEFAULT 'pending',

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cancelled_at TIMESTAMPTZ,

        CONSTRAINT fk_collection_requests_estate
          FOREIGN KEY (estate_id)
          REFERENCES estates(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_collection_requests_requested_by
          FOREIGN KEY (requested_by_user_id)
          REFERENCES users(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_collection_requests_created_by
          FOREIGN KEY (created_by_user_id)
          REFERENCES users(id)
          ON DELETE RESTRICT,

        CONSTRAINT chk_collection_requests_source
          CHECK (
            source IN (
              'estate_submitted',
              'factory_created_on_behalf'
            )
          ),

        CONSTRAINT chk_collection_requests_weight
          CHECK (requested_weight_kg > 0),

        CONSTRAINT chk_collection_requests_status
          CHECK (
            status IN (
              'pending',
              'assigned',
              'accepted',
              'cancelled',
              'collected',
              'delivered'
            )
          )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collection_requests_estate_status
      ON tea_collection_requests (estate_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collection_requests_status_date
      ON tea_collection_requests (status, requested_collection_date);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collection_requests_created_by
      ON tea_collection_requests (created_by_user_id);
    `);

    await queryRunner.query(`
      CREATE TABLE tea_collection_request_assignments (
        id SERIAL PRIMARY KEY,

        request_id INTEGER NOT NULL,
        agent_id INTEGER NOT NULL,
        assigned_by_user_id INTEGER,

        status VARCHAR(20) NOT NULL DEFAULT 'offered',

        offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        response_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_request_assignments_request
          FOREIGN KEY (request_id)
          REFERENCES tea_collection_requests(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_request_assignments_agent
          FOREIGN KEY (agent_id)
          REFERENCES collection_agents(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_request_assignments_assigned_by
          FOREIGN KEY (assigned_by_user_id)
          REFERENCES users(id)
          ON DELETE SET NULL,

        CONSTRAINT chk_request_assignments_status
          CHECK (
            status IN (
              'offered',
              'accepted',
              'declined',
              'cancelled',
              'completed'
            )
          )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_request_assignments_request_status
      ON tea_collection_request_assignments (request_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_request_assignments_agent_status
      ON tea_collection_request_assignments (agent_id, status);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_request_one_open_assignment
      ON tea_collection_request_assignments (request_id)
      WHERE status IN ('offered', 'accepted');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_request_one_open_assignment;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS tea_collection_request_assignments;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS tea_collection_requests;
    `);
  }
}

