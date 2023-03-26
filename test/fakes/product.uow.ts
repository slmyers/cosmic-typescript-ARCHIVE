import { IOrderLine, IProduct } from '$/model/index';
import { scoped, Lifecycle, inject } from 'tsyringe';
import { FakeProductRepository } from './product.repository.js';
import { FakeUnitOfWork } from '@/unitofwork/fake.unitofwork';

@scoped(Lifecycle.ContainerScoped)
export class FakeProductUnitOfWork extends FakeUnitOfWork {
    constructor(
        @inject(FakeProductRepository)
        readonly productRepository: FakeProductRepository,
    ) {
        super();
    }

    async allocate(orderLine: IOrderLine): Promise<string> {
        let result = null;

        const product = await this.get(orderLine.sku);

        if (!product) {
            throw new Error(`Product ${orderLine.sku} not found`);
        }

        try {
            result = await this.productRepository.allocate(orderLine);
        } catch (error: any) {
            await super.rollback();
            throw error;
        }
        return result.ref;
    }

    async get(sku: string): Promise<IProduct> {
        let result = null;

        try {
            result = await this.productRepository.get(sku);
        } catch (error: any) {
            await super.rollback();
            throw error;
        }
        return result;
    }

    async save(product: IProduct): Promise<IProduct> {
        let result = null;
        try {
            result = await this.productRepository.save(product);
        } catch (error: any) {
            await super.rollback();
            throw error;
        }

        return result;
    }
}
