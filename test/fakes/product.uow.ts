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
        void this.init();
    }

    async allocate(product: IProduct, orderLine: IOrderLine): Promise<string> {
        let result = null;

        try {
            result = await this.productRepository.allocate(product, orderLine);
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

    getState(): string[] {
        return this.state;
    }
}
