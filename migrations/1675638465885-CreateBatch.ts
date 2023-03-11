import { MigrationInterface, QueryRunner } from 'typeorm';

const dbType = String(process.env.DB_TYPE);

export class CreateBatch1675638465885 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (dbType === 'sqlite') {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS batch(
                    id INTEGER PRIMARY KEY,
                    sku           TEXT    NOT NULL,
                    quantity      INT     NOT NULL,
                    reference     TEXT    NOT NULL,
                    eta           DATETIME NOT NULL,
                    created       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    constraint UQ_batch_reference unique (reference)
                );
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS IDX_batch_reference ON batch (reference);
                CREATE INDEX IF NOT EXISTS IDX_batch_sku ON batch (sku);
            `);
        } else if (dbType === 'postgres') {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS batch(
                    id SERIAL PRIMARY KEY,
                    sku           TEXT    NOT NULL,
                    quantity      INT     NOT NULL,
                    reference     TEXT    NOT NULL,
                    eta           TIMESTAMP NOT NULL,
                    created       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    constraint UQ_batch_reference unique (reference)
                );
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS IDX_batch_reference ON batch (reference);
                CREATE INDEX IF NOT EXISTS IDX_batch_sku ON batch (sku);
            `);
        } else {
            throw new Error(`DB_TYPE ${dbType} not supported`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS batch`);
    }
}
