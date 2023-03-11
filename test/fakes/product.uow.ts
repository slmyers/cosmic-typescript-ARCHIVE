import { IOrderLine, IProduct } from '$/model/index';
import { UoW, workState } from '$/types/index';
import { scoped, Lifecycle, inject } from 'tsyringe';
import { FakeProductRepository } from './product.repository.js';

@scoped(Lifecycle.ContainerScoped)
export class FakeProductUnitOfWork implements UoW {
    state: workState[] = [];
    errors: Error[] = [];
    constructor(
        @inject(FakeProductRepository)
        readonly productRepository: FakeProductRepository,
    ) {
        void this.init();
    }
    // these methods should be inheritied from the abstract class
    async init(): Promise<void> {
        if (this.released || this.committed || this.rolledback) {
            throw new Error('UnitOfWork is already disposed');
        }

        this.state.unshift('init');

        this.state.unshift('connected');
    }
    get connected() {
        return this.state.includes('connected');
    }

    get initialized() {
        return this.state.includes('init');
    }

    get committed() {
        return this.state.includes('committed');
    }

    get rolledback() {
        return this.state.includes('rolledback');
    }

    get released() {
        return this.state.includes('released');
    }

    async dispose() {
        if (!this.connected) {
            return;
        }

        if (this.committed || this.rolledback) {
            return this.release();
        }

        if (this.errors.length > 0) {
            await this.rollback();
        } else {
            await this.commit();
        }

        if (!this.released) {
            await this.release();
        }
    }
    async commit(): Promise<void> {
        this.state.unshift('committed');
    }
    async rollback(): Promise<void> {
        this.state.unshift('rolledback');
    }
    async release(): Promise<void> {
        this.state.unshift('released');
    }

    async allocate(product: IProduct, orderLine: IOrderLine): Promise<string> {
        let result = null;

        try {
            result = await this.productRepository.allocate(product, orderLine);
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }

        return result;
    }
}
