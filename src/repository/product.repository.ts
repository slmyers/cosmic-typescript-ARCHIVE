import {
    Entity,
    PrimaryGeneratedColumn,
    QueryRunner,
    Repository,
} from 'typeorm';
import {
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

    constructor(queryRunnner: QueryRunner) {
        super(ProductEntity, queryRunnner.manager, queryRunnner);
        this.isPostgres =
            queryRunnner.connection.driver.options.type === 'postgres';

        if (!this.isPostgres) {
            throw new Error(
                `Unsupported database type: ${queryRunnner.connection.driver.options.type}`,
            );
        }
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
                INSERT INTO order_line (sku, quantity, "batchId", reference)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `,
            [orderLine.sku, orderLine.quantity, batchId, orderLine.reference],
        );

        return res[0]?.id;
    }

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
        const ref = p.allocate(orderLine);

        if (ref) {
            const batch = batches.find((b: IBatch) => b.reference === ref);
            // TODO: when we remove typeorm we shouldn't have a dependency on id
            if (batch && batch.options.id) {
                const orderId = await this.addOrderLine(
                    orderLine,
                    batch.options.id,
                );
                if (!orderId) {
                    throw new Error(`Unable to add order line`);
                }
            } else {
                throw new Error(`Unable to find batch`);
            }
        }

        return {
            version: p.version,
            ref,
        };
    }

    async get(sku: string): Promise<IProduct> {
        if (!sku) {
            throw new Error(`Product sku not supplied.`);
        }

        if (!this.queryRunner) {
            throw new Error(`Query runner not found`);
        }

        const rows = await this.query(
            `
            SELECT 
                p.id, p.sku, p.version, p.created, p.modified,
                json_agg(json_build_object(
                    'id', b.id,
                    'sku', b.sku,
                    'quantity', b.quantity,
                    'reference', b.reference,
                    'eta', b.eta,
                    'created', b.created,
                    'modified', b.modified
                )) AS "batches",
                json_agg(json_build_object(
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
            GROUP BY p.id;
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

        const batches = raw.batches.map((b: any) => {
            const orderLines = raw.orderLines
                .filter((o: any) => o.batchId === b.id)
                .map((o: any) => new OrderLine(o.sku, o.quantity));
            return new Batch(b.reference, b.sku, b.quantity, b.eta, {
                orderLines,
                id: b.id,
            });
        });

        return new Product(raw.sku, batches, raw.version);
    }
}

@Entity({ name: 'product' })
export class ProductEntity {
    /* going to remove typeorm */
    @PrimaryGeneratedColumn()
    id!: number;
}
