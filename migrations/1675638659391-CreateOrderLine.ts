import { MigrationInterface, QueryRunner } from 'typeorm';

const dbType = String(process.env.DB_TYPE);

export class CreateOrderLine1675638659391 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (dbType === 'sqlite') {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS order_line (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku           TEXT    NOT NULL,
                    quantity      INT     NOT NULL,
                    reference     TEXT    NOT NULL,
                    batch_id      INT     NOT NULL,
                    created       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    constraint UQ_order_line_reference unique (reference),
                    constraint FK_batch_id foreign key (batch_id) references batch(id)
                )
            `);
        } else if (dbType === 'postgres') {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS order_line (
                    id SERIAL PRIMARY KEY,
                    sku           TEXT    NOT NULL,
                    quantity      INT     NOT NULL,
                    reference     TEXT    NOT NULL,
                    batch_id      INT     NOT NULL,
                    created       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    constraint UQ_order_line_reference unique (reference),
                    constraint FK_batch_id foreign key (batch_id) references batch(id)
                )
            `);
        } else {
            throw new Error(`DB_TYPE ${dbType} not supported`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS order_line');
    }
}
