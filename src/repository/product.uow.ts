import { AbstractTypeormUnitOfWork } from '@/unitofwork/typeorm.unitofwork';
import { DataSource } from 'typeorm';
import { Lifecycle, scoped } from 'tsyringe';
import { inject } from 'tsyringe';
import { IOrderLine } from '$/model/orderline.model';
import { IProduct } from '$/model/product.model';
import {
    concurrencyControlStrategy,
    ProductLock,
    ProductRepo,
} from '$/types/index';
import { ProductRepository } from './product.repository';
import { EnvironmentSingleton } from '@/environment/environment.singleton.js';

@scoped(Lifecycle.ContainerScoped)
export class ProductUnitOfWork extends AbstractTypeormUnitOfWork {
    productRepository!: ProductRepo;
    public lock: ProductLock | null = null;
    private concurrencyControlStrategy!: concurrencyControlStrategy;

    constructor(
        @inject(DataSource)
        dataSource: DataSource,
        @inject(EnvironmentSingleton)
        environment: EnvironmentSingleton,
    ) {
        super(dataSource, [], []);
        this.productRepository = new ProductRepository(this.queryRunner);
        this.concurrencyControlStrategy = environment.get(
            'CONCURRENCY_CONTROL_STRATEGY',
        ) as concurrencyControlStrategy;
    }

    async allocate(orderLine: IOrderLine): Promise<string> {
        let result = null;

        try {
            if (this.pessimisticStrategy) {
                if (!(await this._lock(orderLine.sku))) {
                    this.lock = null;
                    throw new Error(`Order sku ${orderLine.sku} not found`);
                }
            }
            const product = await this.get(orderLine.sku);
            if (!product) {
                throw new Error(`Product ${orderLine.sku} not found`);
            }
            const currentVersion = product.version;

            result = await this.productRepository.allocate(product, orderLine);

            if (result.ref) {
                const [, affectedCount] = await this.queryRunner.query(
                    'UPDATE product SET version = $1 WHERE sku = $2 AND version = $3 RETURNING id;',
                    [product.version, product.sku, currentVersion],
                );
                if (affectedCount !== 1) {
                    throw new Error(
                        `Product ${orderLine.sku} version mismatch`,
                    );
                }
            }
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }

        return result.ref;
    }

    async get(sku: string): Promise<IProduct> {
        let result = null;

        try {
            result = await this.productRepository.get(sku);
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }
        return result;
    }

    async save(product: IProduct): Promise<IProduct> {
        let result = null;
        try {
            result = await this.productRepository.save(product);
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }

        return result;
    }

    private async _lock(sku: string): Promise<ProductLock> {
        const [lock] = await this.queryRunner.query(
            'SELECT id, version FROM product WHERE sku = $1 FOR UPDATE',
            [sku],
        );

        this.lock = lock;

        return lock;
    }

    get pessimisticStrategy(): boolean {
        return this.concurrencyControlStrategy === 'PESSIMISTIC';
    }

    async commit(): Promise<void> {
        await super.commit();
        if (this.pessimisticStrategy) {
            this.lock = null;
        }
    }

    async rollback(): Promise<void> {
        await super.rollback();
        if (this.pessimisticStrategy) {
            this.lock = null;
        }
    }

    async release(): Promise<void> {
        await super.release();
        if (this.pessimisticStrategy) {
            this.lock = null;
        }
    }

    getState(): string[] {
        return [
            this.pessimisticStrategy ? JSON.stringify(this.lock) : '',
            ...super.getState(),
        ].filter(Boolean);
    }
}
