import { AbstractTypeormUnitOfWork } from '@/unitofwork/typeorm.unitofwork';
import { DataSource } from 'typeorm';
import { Lifecycle, scoped } from 'tsyringe';
import { inject } from 'tsyringe';
import { IOrderLine } from '$/model/orderline.model';
import { IProduct } from '$/model/product.model';
import { ProductRepo } from '$/types/index';
import { ProductRepository } from './product.repository';

@scoped(Lifecycle.ContainerScoped)
export class ProductUnitOfWork extends AbstractTypeormUnitOfWork {
    productRepository!: ProductRepo;

    constructor(
        @inject(DataSource)
        dataSource: DataSource,
    ) {
        super(dataSource, [], []);
        this.productRepository = new ProductRepository(this.queryRunner);
    }

    async allocate(orderLine: IOrderLine): Promise<string> {
        let result = null;

        try {
            // console.log('locking product', orderLine.sku, this.id);
            const lock = await this.queryRunner.query(
                'SELECT id, sku FROM product WHERE sku = $1 FOR UPDATE',
                [orderLine.sku],
            );
            // console.log(lock, this.id);
            if (lock.length !== 1) {
                throw new Error(`Order sku ${orderLine.sku} not found`);
            }

            // console.log('releasing lock', orderLine.sku, this.id);

            const product = await this.get(orderLine.sku);
            if (!product) {
                throw new Error(`Product ${orderLine.sku} not found`);
            }

            result = await this.productRepository.allocate(product, orderLine);

            if (result.ref) {
                await this.queryRunner.query(
                    'UPDATE product SET version = version + 1 WHERE sku = $1',
                    [product.sku],
                );
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
}
