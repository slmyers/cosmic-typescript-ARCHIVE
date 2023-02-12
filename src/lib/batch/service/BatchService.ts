import { DataSource, EntityManager } from 'typeorm';
import { injectable, inject } from 'tsyringe';
import { BatchEntity, allocate } from '$batch/model';
import { IOrderLine, OrderLineEntity } from '$orderline/model';

@injectable()
export class BatchService {
    static NO_BATCH_AVAILABLE = 'No batch available';
    private manager: EntityManager;
    constructor(
        @inject(DataSource)
        dataSource: DataSource,
    ) {
        this.manager = dataSource.manager;
    }

    /**
     * @memberof BatchService
     * @param {IOrderLine} orderLine
     * @returns {Promise<BatchEntity>}
     */
    async allocate(orderLine: IOrderLine): Promise<BatchEntity> {
        const batches = await this.manager.find(BatchEntity, {
            where: { sku: orderLine.sku },
            order: { eta: 'ASC' },
            take: 100,
        });
        if (batches.length) {
            const reference = allocate(orderLine, batches);
            const batch = batches.find((b) => b.reference === reference);
            if (!(batch && batch.id)) {
                throw new Error(BatchService.NO_BATCH_AVAILABLE);
            }
            return this.manager.transaction(async (manager) => {
                const result = await manager.save(batch);
                const line = new OrderLineEntity(
                    orderLine.sku,
                    orderLine.quantity,
                );
                line.batchId = batch.id;
                await manager.save(orderLine);
                return result;
            });
        }

        throw new Error(BatchService.NO_BATCH_AVAILABLE);
    }
}
