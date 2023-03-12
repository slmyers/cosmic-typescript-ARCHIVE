import { FakeBatchRepository } from './batch.repository';
import { Batch, IOrderLine } from '$/model/index';
import { FakeUnitOfWork } from '@/unitofwork/fake.unitofwork';
import { scoped, Lifecycle, inject } from 'tsyringe';

@scoped(Lifecycle.ContainerScoped)
export class FakeBatchUnitOfWork extends FakeUnitOfWork {
    constructor(
        @inject(FakeBatchRepository)
        readonly batchRepository: FakeBatchRepository,
    ) {
        super();
        void this.init();
    }

    async allocate(batch: Batch, orderLine: IOrderLine): Promise<IOrderLine> {
        let result = null;

        try {
            result = await this.batchRepository.allocate(batch, orderLine);
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }

        return result;
    }
}
