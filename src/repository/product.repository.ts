import { Entity, QueryRunner, Repository } from 'typeorm';
import {
    allocate,
    Batch,
    IBatch,
    IOrderLine,
    IProduct,
    OrderLine,
    Product,
} from '$/model/index';
import { ProductRepo, ProductAllocation } from '$/types/index';

export class ProductRepository
    extends Repository<ProductEntity>
    implements ProductRepo
{
    private isPostgres: boolean;
    private isSqlite: boolean;

    constructor(queryRunnner: QueryRunner) {
        super(ProductEntity, queryRunnner.manager, queryRunnner);
        this.isPostgres =
            queryRunnner.connection.driver.options.type === 'postgres';
        this.isSqlite =
            queryRunnner.connection.driver.options.type === 'sqlite';

        if (!(this.isPostgres || this.isSqlite)) {
            throw new Error(
                `Unsupported database type: ${queryRunnner.connection.driver.options.type}`,
            );
        }
    }

    get agg(): string {
        return this.isPostgres
            ? 'json_agg'
            : this.isSqlite
            ? 'json_group_array'
            : '';
    }

    get obj(): string {
        return this.isPostgres
            ? 'json_build_object'
            : this.isSqlite
            ? 'json_object'
            : '';
    }

    async addOrderLine(
        orderLine: IOrderLine,
        batchId: number,
    ): Promise<number> {
        if (!orderLine) {
            throw new Error(`Order line not supplied.`);
        }
        if (!this.queryRunner) {
            throw new Error(`Query runner not found`);
        }

        const res = await this.queryRunner.query(
            `
                INSERT INTO order_line (sku, quantity, batch_id)
                VALUES ($1, $2, $3)
                RETURNING id
            `,
            [orderLine.sku, orderLine.quantity, batchId],
        );

        return this.isPostgres ? res[0].id : this.isSqlite ? res[0] : 0;
    }

    // allocate an order line to a product
    async allocate(
        product: IProduct,
        orderLine: IOrderLine,
    ): Promise<ProductAllocation> {
        if (!(product && product.sku)) {
            throw new Error(`Product not found`);
        }

        if (!this.queryRunner) {
            throw new Error(`Query runner not found`);
        }

        const p = await this.get(product.sku);

        if (!(p.batches && p.batches.length)) {
            throw new Error(`No batches found for product ${product.sku}`);
        }

        const batches = p.batches.sort((a, b) => a.priority(b));

        const ref = allocate(orderLine, batches);

        if (ref) {
            const batch = batches.find((b: IBatch) => b.reference === ref);
            if (batch && batch.id) {
                const orderId = await this.addOrderLine(orderLine, batch.id);
                if (!orderId) {
                    throw new Error(`Unable to add order line`);
                }
            }
        }

        return {
            version: p.version,
            ref,
        };
    }

    // get a product by sku
    async get(sku: string): Promise<IProduct> {
        if (!sku) {
            throw new Error(`Product sku not supplied.`);
        }

        if (!this.queryRunner) {
            throw new Error(`Query runner not found`);
        }

        const { agg, obj } = this;

        const rows = await this.query(
            `
            SELECT 
                p.id, p.sku, p.version, p.created, p.modified,
                -- these json function are meant for sqlite will need to modify for pg
                ${agg}(${obj}(
                    'id', b.id,
                    'sku', b.sku,
                    'quantity', b.quantity,
                    'reference', b.reference,
                    'eta', b.eta,
                    'created', b.created,
                    'modified', b.modified
                )) AS "batches",
                ${agg}(${obj}(
                    'id', o.id,
                    'sku', o.sku,
                    'quantity', o.quantity,
                    'created', o.created,
                    'modified', o.modified,
                    'batchId', o."batchId"
                )) AS "orderLines"
            FROM product p
            LEFT JOIN batch b ON b."productId" = p.id
            LEFT JOIN order_line o ON o."batchId" = b.id
            WHERE p.sku = $1
            GROUP BY p.id
        `,
            [sku],
        );
        if (!rows.length) {
            throw new Error(`Product not found`);
        }

        if (rows.length > 1) {
            throw new Error(`Multiple products found`);
        }

        const raw = rows[0];

        if (this.isSqlite) {
            raw.batches = JSON.parse(raw.batches).filter((b: any) =>
                Boolean(b.id),
            );
            raw.orderLines = JSON.parse(raw.orderLines);
        }

        const batches = raw.batches.map((b: any) => {
            const orderLines = raw.orderLines
                .filter((o: any) => o.batchId === b.id)
                .map((o: any) => new OrderLine(o.sku, o.quantity));
            return new Batch(b.reference, b.sku, b.quantity, b.eta, orderLines);
        });

        return new Product(raw.sku, batches, raw.version);
    }
}

@Entity({ name: 'product' })
export class ProductEntity {
    /* going to remove typeorm */
}
