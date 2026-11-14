import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Update the tea collection workflow from an offered/accepted dispatch process
 * to a request -> accepted assignment -> collection -> delivery lifecycle.
 *
 * Main schema changes:
 *  - tea_collection_requests: require requested_by_user_id; simplify statuses;
 *    drop creator/source/scheduling/estimated-weight fields.
 *  - tea_collection_request_assignments: remove offers/responses; add collection,
 *    delivery, cancellation, and received/collected-weight tracking.
 *  - tea_collection_verifications: record collection/delivery confirmation.
 *  - tea_collection_evidence: record photo evidence metadata.
 *  - tea_collection_discrepancies: record and resolve weight mismatches.
 *
 * IMPORTANT:
 *  - A verification method of "qr" only records the method; QR issuance and
 *    verification security need separate application logic.
 *  - CHECK constraints validate supplied rows but do not themselves require
 *    evidence/verification records for every collection or delivery.
 *  - down() intentionally refuses to run if any requests/assignments exist.
 *
 */
export class UpdateTeaCollectionWorkflow1794204118594 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // =================================================================
    // REQUEST TABLE
    // =================================================================
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_collection_requests_status_date;
      DROP INDEX IF EXISTS idx_collection_requests_created_by;
      DROP INDEX IF EXISTS idx_collection_requests_estate_status;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
      DROP CONSTRAINT fk_collection_requests_requested_by,
      DROP CONSTRAINT fk_collection_requests_created_by,
      DROP CONSTRAINT chk_collection_requests_source,
      DROP CONSTRAINT chk_collection_requests_weight,
      DROP CONSTRAINT chk_collection_requests_status;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
      DROP COLUMN created_by_user_id,
      DROP COLUMN source,
      DROP COLUMN requested_weight_kg,
      DROP COLUMN requested_collection_date;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
      ALTER COLUMN requested_by_user_id SET NOT NULL,
      ALTER COLUMN status SET DEFAULT 'open';
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
      ADD CONSTRAINT fk_collection_requests_requested_by
      FOREIGN KEY (requested_by_user_id)
      REFERENCES users(id)
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
      ADD CONSTRAINT chk_collection_requests_status
      CHECK (
          status IN (
          'open',
          'accepted',
          'collected',
          'delivered',
          'cancelled'
      )
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
      ADD CONSTRAINT chk_collection_requests_cancelled_at
      CHECK (
          (status = 'cancelled') =
          (cancelled_at IS NOT NULL)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collection_requests_estate_created
      ON tea_collection_requests (estate_id, created_at DESC);
      CREATE INDEX idx_collection_requests_status_created
      ON tea_collection_requests (status, created_at DESC);
      CREATE INDEX idx_collection_requests_requested_by
      ON tea_collection_requests (requested_by_user_id);
    `);

    // =================================================================
    // ASSIGNMENT TABLE
    // =================================================================.
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_request_one_open_assignment;
      DROP INDEX IF EXISTS idx_request_assignments_request_status;
      DROP INDEX IF EXISTS idx_request_assignments_agent_status;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
      DROP CONSTRAINT fk_request_assignments_assigned_by,
      DROP CONSTRAINT chk_request_assignments_status;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
      DROP COLUMN assigned_by_user_id,
      DROP COLUMN offered_at,
      DROP COLUMN responded_at,
      DROP COLUMN response_reason;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
      ADD COLUMN accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN collected_at TIMESTAMPTZ,
      ADD COLUMN delivered_at TIMESTAMPTZ,
      ADD COLUMN collected_weight_kg NUMERIC(10, 2),
      ADD COLUMN received_weight_kg NUMERIC(10, 2),
      ADD COLUMN cancelled_at TIMESTAMPTZ,
      ADD COLUMN cancellation_reason TEXT,
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
      ALTER COLUMN status SET DEFAULT 'accepted';
    `);

    await queryRunner.query(`
          ALTER TABLE tea_collection_request_assignments
          ADD CONSTRAINT chk_request_assignments_status
          CHECK (
              status IN (
              'accepted',
              'collected',
              'delivered',
              'cancelled'
          )
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
      ADD CONSTRAINT chk_assignment_collected_weight
      CHECK (
          collected_weight_kg IS NULL
          OR collected_weight_kg > 0
      ),
      ADD CONSTRAINT chk_assignment_received_weight
      CHECK (
          received_weight_kg IS NULL
          OR received_weight_kg > 0
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
      ADD CONSTRAINT chk_assignment_collected_data
      CHECK (
          status NOT IN ('collected', 'delivered')
      OR (
          collected_at IS NOT NULL
      AND collected_weight_kg IS NOT NULL
      )
      ),
      ADD CONSTRAINT chk_assignment_delivered_data
          CHECK (
              status <> 'delivered'
          OR (
              delivered_at IS NOT NULL
          AND received_weight_kg IS NOT NULL
          )
      ),
      ADD CONSTRAINT chk_assignment_cancelled_data
          CHECK (
              (status = 'cancelled') =
              (cancelled_at IS NOT NULL)
          );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_request_active_assignment
      ON tea_collection_request_assignments (request_id)
      WHERE status IN (
          'accepted',
          'collected',
          'delivered'
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_request_assignments_request_status
      ON tea_collection_request_assignments (request_id, status);
      CREATE INDEX idx_request_assignments_agent_status
      ON tea_collection_request_assignments (agent_id, status);
    `);

    // =================================================================
    // VERIFICATIONS
    // =================================================================
    await queryRunner.query(`
          CREATE TABLE tea_collection_verifications (
          id SERIAL PRIMARY KEY,
          assignment_id INTEGER NOT NULL,
          verification_stage VARCHAR(20) NOT NULL,
          verification_method VARCHAR(20) NOT NULL,
          verified_by_user_id INTEGER NOT NULL,
          verified_weight_kg NUMERIC(10, 2) NOT NULL,
          verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_verifications
      ADD CONSTRAINT fk_verifications_assignment
      FOREIGN KEY (assignment_id)
      REFERENCES tea_collection_request_assignments(id)
      ON DELETE RESTRICT,
      ADD CONSTRAINT fk_verifications_verified_by
      FOREIGN KEY (verified_by_user_id)
      REFERENCES users(id)
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_verifications
      ADD CONSTRAINT chk_verification_stage
        CHECK (
          verification_stage IN (
            'collection',
            'delivery'
          )
        ),
      ADD CONSTRAINT chk_verification_method
        CHECK (
          verification_method IN (
            'in_app',
            'qr'
          )
        ),
      ADD CONSTRAINT chk_verified_weight
        CHECK (verified_weight_kg > 0);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_assignment_verification_stage
      ON tea_collection_verifications (
        assignment_id,
        verification_stage
      );
    `);

    // =================================================================
    // PHOTO/FILE EVIDENCE
    // =================================================================

    await queryRunner.query(`
      CREATE TABLE tea_collection_evidence (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL,
        uploaded_by_user_id INTEGER NOT NULL,
        evidence_type VARCHAR(40) NOT NULL,
        file_path TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_evidence
      ADD CONSTRAINT fk_evidence_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES tea_collection_request_assignments(id)
        ON DELETE RESTRICT,
      ADD CONSTRAINT fk_evidence_uploaded_by
        FOREIGN KEY (uploaded_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_evidence
      ADD CONSTRAINT chk_evidence_type
        CHECK (
          evidence_type IN (
            'agent_collection_photo',
            'manager_collection_photo',
            'delivery_photo'
          )
        ),
      ADD CONSTRAINT chk_evidence_file_path
        CHECK (
          LENGTH(TRIM(file_path)) > 0
        );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_evidence_assignment
      ON tea_collection_evidence (assignment_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_evidence_uploaded_by
      ON tea_collection_evidence (uploaded_by_user_id);
    `);

    // =================================================================
    // WEIGHT DISCREPANCIES
    // =================================================================

    await queryRunner.query(`
      CREATE TABLE tea_collection_discrepancies (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolution_notes TEXT,
        resolved_by_user_id INTEGER,
        resolved_at TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_discrepancies
      ADD CONSTRAINT fk_discrepancies_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES tea_collection_request_assignments(id)
        ON DELETE RESTRICT,
      ADD CONSTRAINT fk_discrepancies_resolved_by
        FOREIGN KEY (resolved_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_discrepancies
      ADD CONSTRAINT chk_discrepancy_status
        CHECK (
          status IN (
            'open',
            'under_review',
            'resolved'
          )
        ),
      ADD CONSTRAINT chk_discrepancy_resolution
        CHECK (
          (
            status = 'resolved'
            AND resolved_by_user_id IS NOT NULL
            AND resolved_at IS NOT NULL
            AND NULLIF(TRIM(resolution_notes), '') IS NOT NULL
          )
          OR
          (
            status <> 'resolved'
            AND resolved_by_user_id IS NULL
            AND resolved_at IS NULL
          )
        );
    `);


    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_discrepancy_assignment
      ON tea_collection_discrepancies (assignment_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_discrepancies_status_reported
      ON tea_collection_discrepancies (
        status,
        reported_at DESC
      );
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [result] = await queryRunner.query(`
      SELECT
        EXISTS (
          SELECT 1 FROM tea_collection_requests
        ) AS has_requests,
        EXISTS (
          SELECT 1 FROM tea_collection_request_assignments
        ) AS has_assignments;
    `);

    if (result.has_requests || result.has_assignments) {
      throw new Error(
        'Rollback blocked: Tea collection data exists. ' +
          'Reverting this migration could cause data loss.',
      );
    }

    await queryRunner.query(`
      DROP TABLE tea_collection_discrepancies;
    `);

    await queryRunner.query(`
      DROP TABLE tea_collection_evidence;
    `);

    await queryRunner.query(`
      DROP TABLE tea_collection_verifications;
    `);

    await queryRunner.query(`
      DROP INDEX uq_request_active_assignment;
      DROP INDEX idx_request_assignments_request_status;
      DROP INDEX idx_request_assignments_agent_status;
    `);


    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
        DROP CONSTRAINT chk_request_assignments_status,
        DROP CONSTRAINT chk_assignment_collected_weight,
        DROP CONSTRAINT chk_assignment_received_weight,
        DROP CONSTRAINT chk_assignment_collected_data,
        DROP CONSTRAINT chk_assignment_delivered_data,
        DROP CONSTRAINT chk_assignment_cancelled_data;
    `);


    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
        DROP COLUMN accepted_at,
        DROP COLUMN collected_at,
        DROP COLUMN delivered_at,
        DROP COLUMN collected_weight_kg,
        DROP COLUMN received_weight_kg,
        DROP COLUMN cancelled_at,
        DROP COLUMN cancellation_reason,
        DROP COLUMN updated_at;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
        ADD COLUMN assigned_by_user_id INTEGER,
        ADD COLUMN offered_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW(),
        ADD COLUMN responded_at TIMESTAMPTZ,
        ADD COLUMN response_reason TEXT,
        ALTER COLUMN status SET DEFAULT 'offered';
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
        ADD CONSTRAINT fk_request_assignments_assigned_by
        FOREIGN KEY (assigned_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_request_assignments
        ADD CONSTRAINT chk_request_assignments_status
        CHECK (
          status IN (
            'offered',
            'accepted',
            'declined',
            'cancelled',
            'completed'
          )
        );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_request_assignments_request_status
      ON tea_collection_request_assignments (request_id, status);
      CREATE INDEX idx_request_assignments_agent_status
      ON tea_collection_request_assignments (agent_id, status);
      CREATE UNIQUE INDEX uq_request_one_open_assignment
      ON tea_collection_request_assignments (request_id)
      WHERE status IN ('offered', 'accepted');
    `);

    await queryRunner.query(`
      DROP INDEX idx_collection_requests_estate_created;
      DROP INDEX idx_collection_requests_status_created;
      DROP INDEX idx_collection_requests_requested_by;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
        DROP CONSTRAINT fk_collection_requests_requested_by,
        DROP CONSTRAINT chk_collection_requests_status,
        DROP CONSTRAINT chk_collection_requests_cancelled_at;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
        ADD COLUMN created_by_user_id INTEGER NOT NULL,
        ADD COLUMN source VARCHAR(40) NOT NULL,
        ADD COLUMN requested_weight_kg NUMERIC(10, 2) NOT NULL,
        ADD COLUMN requested_collection_date DATE NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
        ALTER COLUMN requested_by_user_id DROP NOT NULL,
        ALTER COLUMN status SET DEFAULT 'pending';
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
        ADD CONSTRAINT fk_collection_requests_requested_by
        FOREIGN KEY (requested_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
        ADD CONSTRAINT fk_collection_requests_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE tea_collection_requests
        ADD CONSTRAINT chk_collection_requests_source
        CHECK (
          source IN (
            'estate_submitted',
            'factory_created_on_behalf'
          )
        ),
        ADD CONSTRAINT chk_collection_requests_weight
        CHECK (requested_weight_kg > 0),
        ADD CONSTRAINT chk_collection_requests_status
        CHECK (
          status IN (
            'pending',
            'assigned',
            'accepted',
            'cancelled',
            'collected',
            'delivered'
          )
        );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_collection_requests_estate_status
      ON tea_collection_requests (estate_id, status);
      CREATE INDEX idx_collection_requests_status_date
      ON tea_collection_requests (
        status,
        requested_collection_date
      );
      CREATE INDEX idx_collection_requests_created_by
      ON tea_collection_requests (created_by_user_id);
    `);

  }
}
