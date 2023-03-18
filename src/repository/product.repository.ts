import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    QueryRunner,
    Repository,
    UpdateDateColumn,
} from 'typeorm';
import {
    Batch,
    IBatch,
    IOrderLine,
    IProduct,
    OrderLine,
    Product,
} from '$/model/index';
import { ProductRepo } from '$/types/index';
import { BatchEntity, BatchRepository } from './batch.repository.js';

export class ProductRepository
    extends Repository<ProductEntity>
    implements ProductRepo
{
    constructor(queryRunnner: QueryRunner) {
        super(ProductEntity, queryRunnner.manager, queryRunnner);
    }

    // allocate an order line to a product
    async allocate(product: IProduct, orderLine: IOrderLine): Promise<string> {
        if (!(product && product.sku)) {
            throw new Error(`Product not found`);
        }

        if (!this.queryRunner) {
            throw new Error(`Query runner not found`);
        }

        const ref = product.allocate(orderLine);
        if (ref) {
            // it's diffiuclt to inject the BatchRepository because it has a depndency on the QueryRunner which
            // is initialized in the UnitOfWork, that calls this repository. We need a way for the UoW to provide
            // the QueryRunner to the repository OR we could use a factory to create the repository and pass the
            // QueryRunner to the factory.
            // reaguardless, we need to find a way to inject the BatchRepository into this repo.
            const batchRepository = new BatchRepository(this.queryRunner);
            const batch = product.batches?.find((b) => b.reference === ref);
            if (!batch) {
                throw new Error(
                    `Batch ${ref} not found for product ${product.sku}`,
                );
            }
            await batchRepository.allocate(batch, orderLine);
            return batch.reference;
        }

        throw new Error(`Out of stock for sku ${orderLine.sku}`);
    }

    // get a product by sku
    async get(sku: string): Promise<IProduct> {
        if (!sku) {
            throw new Error(`Product not found`);
        }

        if (!this.queryRunner) {
            throw new Error(`Query runner not found`);
        }

        const isPostgres =
            this.queryRunner.connection.driver.options.type === 'postgres';

        const aggregationFunction = isPostgres
            ? 'json_agg'
            : 'json_group_array';
        const jsonFunction = isPostgres ? 'json_build_object' : 'json_object';

        const rows = await this.query(
            `
            SELECT 
                p.id, p.sku, p.version, p.created, p.modified,
                -- these json function are meant for sqlite will need to modify for pg
                ${aggregationFunction}(${jsonFunction}(
                    'id', b.id,
                    'sku', b.sku,
                    'quantity', b.quantity,
                    'reference', b.reference,
                    'eta', b.eta,
                    'created', b.created,
                    'modified', b.modified
                )) AS "batches",
                ${aggregationFunction}(${jsonFunction}(
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

        if (!isPostgres) {
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
export class ProductEntity implements IProduct {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    sku!: string;

    @CreateDateColumn()
    created!: Date;

    @UpdateDateColumn()
    modified!: Date;

    @Column()
    version!: number;

    @OneToMany(() => BatchEntity, (batch) => batch.product)
    batches: IBatch[] | undefined;

    allocate(line: IOrderLine): string {
        const batches = this.batches?.map((b) => b.toModel());

        if (batches) {
            const batch = batches.find((b) => b.canAllocate(line));
            if (batch) {
                batch.allocate(line);
                return batch.reference;
            }
        }

        throw new Error(`Out of stock for sku ${line.sku}`);
    }

    toModel(): IProduct {
        return new Product(this.sku, this.batches || [], this.version);
    }

    constructor(values?: Partial<ProductEntity>) {
        Object.assign(this, values);
    }
}
