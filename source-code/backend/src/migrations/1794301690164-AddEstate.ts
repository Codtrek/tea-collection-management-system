import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEstate1794301690164 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "estates"
                ADD COLUMN "area_acres" NUMERIC(10, 2),
                ADD COLUMN "manager_id" INTEGER,
                ADD CONSTRAINT "estates_manager_id_fkey"
                    FOREIGN KEY ("manager_id")
                    REFERENCES "tea_estate_managers" ("id")
                    ON DELETE SET NULL 
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
