import { MigrationInterface, QueryRunner } from 'typeorm';

const dbType = String(process.env.DB_TYPE);

export class CreateProduct1677979285547 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (dbType === 'sqlite') {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS product (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku           TEXT    NOT NULL,
                    created       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version      INTEGER NOT NULL DEFAULT 0,
                    constraint UQ_product_sku unique (sku)
                );
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS IDX_product_sku ON product (sku);
            `);

            await queryRunner.query(`
                CREATE TRIGGER IF NOT EXISTS product_version_constraint
                BEFORE UPDATE ON product
                BEGIN
                    SELECT 
                        CASE
                            WHEN old.version <> new.version THEN RAISE(ABORT, 'version mismatch')
                        END;
                END;
            `);

            await queryRunner.query(`
                CREATE TRIGGER IF NOT EXISTS product_version_update
                AFTER UPDATE ON product
                BEGIN
                    UPDATE product SET version = version + 1 WHERE id = old.id;
                END;
            `);
        } else if (dbType === 'postgres') {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS product (
                    id SERIAL PRIMARY KEY,
                    sku           TEXT    NOT NULL,
                    created       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version      INTEGER NOT NULL DEFAULT 0,
                    constraint UQ_product_sku unique (sku)
                )
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS IDX_product_sku ON product (sku);
            `);

            await queryRunner.query(`
                CREATE TRIGGER IF NOT EXISTS product_version_constraint
                BEFORE UPDATE ON product
                BEGIN
                    SELECT 
                        CASE
                            WHEN old.version <> new.version THEN RAISE(ABORT, 'version mismatch')
                        END;
                END;
            `);

            await queryRunner.query(`
                CREATE TRIGGER IF NOT EXISTS product_version_update
                AFTER UPDATE ON product
                BEGIN
                    UPDATE product SET version = version + 1 WHERE id = old.id;
                END;
            `);
        } else {
            throw new Error(`DB_TYPE ${dbType} not supported`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS product;');
    }
}
