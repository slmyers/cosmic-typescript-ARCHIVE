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
import { Batch, IOrderLine, IProduct, Product } from '$/model/index';
import { ProductRepo } from '$/types/index';
import { BatchRepository } from './batch.repository.js';

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

        const product = await this.findOne({
            where: { sku },
            relations: {
                batches: true,
            },
        });
        if (!product) {
            throw new Error(`Product not found`);
        }

        return product;
    }
}

@Entity()
export class ProductEntity implements IProduct {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    sku!: string;

    @CreateDateColumn()
    created!: Date;

    @UpdateDateColumn()
    modified!: Date;

    @OneToMany(() => Batch, (batch) => batch.sku)
    batches: Batch[] | undefined;

    allocate(line: IOrderLine): string {
        const batch = this.batches?.find((b) => b.canAllocate(line));
        if (batch) {
            batch.allocate(line);
            return batch.reference;
        }
        throw new Error(`Out of stock for sku ${line.sku}`);
    }

    toModel(): IProduct {
        return new Product(this.sku, this.batches || [], this.modified);
    }
}
