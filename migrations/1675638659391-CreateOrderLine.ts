import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderLine1675638659391 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS order_line (
                    id SERIAL PRIMARY KEY,
                    sku           TEXT    NOT NULL,
                    quantity      INT     NOT NULL,
                    reference     TEXT    NOT NULL,
                    "batchId"       INT     NOT NULL,
                    created       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    constraint UQ_order_line_reference unique (reference),
                    constraint FK_batch_id foreign key ("batchId") references batch(id)
                );
            `);
        await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS IDX_order_line_reference ON order_line (reference);
                CREATE INDEX IF NOT EXISTS IDX_order_line_batchId ON order_line ("batchId");
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS order_line');
    }
}
