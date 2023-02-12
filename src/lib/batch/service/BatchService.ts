import { Repository } from 'typeorm';
import { injectable, inject } from 'tsyringe';
import { BatchRepository } from '$batch/batch.module';
import { BatchEntity } from '$batch/model';
import { OrderLineEntity } from '$orderline/model';

@injectable()
export class BatchService {
    constructor(
        @inject(BatchRepository)
        private batchRepository: Repository<BatchEntity>,
    ) {}

    /**
     * @memberof BatchService
     * @param {OrderLineEntity} orderLine
     * @returns {Promise<BatchEntity>}
     */
    async allocate(orderLine: OrderLineEntity): Promise<BatchEntity> {
        const batch = await this.batchRepository.findOne({
            where: { sku: orderLine.sku },
            order: { eta: 'ASC' },
        });

        if (batch) {
            batch.allocate(orderLine);
            await this.batchRepository.save(batch);
            return batch;
        }
        return this.batchRepository.save(
            new BatchEntity(
                'batch-001',
                orderLine.sku,
                orderLine.quantity,
                new Date(),
            ),
        );
    }
}
