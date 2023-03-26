import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProduct1677979285547 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS product (
                    id SERIAL PRIMARY KEY,
                    sku           TEXT    NOT NULL,
                    created       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    modified      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version      INTEGER DEFAULT 0 NOT NULL,
                    constraint UQ_product_sku unique (sku)
                )
            `);
        await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS IDX_product_sku ON product (sku);
            `);

        await queryRunner.query(`
                CREATE OR REPLACE FUNCTION product_modified_update()
                    RETURNS trigger AS
                $BODY$
                BEGIN
                    new.modified := NOW();
                    RETURN new;
                END;
                $BODY$
                LANGUAGE plpgsql;


                CREATE TRIGGER product_modified_update_trigger
                BEFORE UPDATE ON product
                FOR EACH ROW EXECUTE FUNCTION product_modified_update();
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS product;');
    }
}
