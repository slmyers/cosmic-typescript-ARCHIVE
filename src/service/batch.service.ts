import { allocate, Batch, IBatch } from '$/model/index.js';
import { IOrderLine } from '$/model/orderline.model.js';
import { BatchEntity, BatchRepository } from '$/repository/index';
import { inject, injectable } from 'tsyringe';
import { FindOneOptions, FindManyOptions } from 'typeorm';

@injectable()
export class BatchService {
    constructor(
        @inject(BatchRepository)
        private readonly batchRepository: BatchRepository,
    ) {}

    async allocateOrderline(orderLine: IOrderLine): Promise<void> {
        const batchEntities = await this.batchRepository.find({
            where: { sku: orderLine.sku },
            take: 100,
            order: {
                eta: 'ASC',
            },
        });

        const batches = batchEntities.map((b) => b.toModel());

        const ref = allocate(orderLine, batches);
        if (ref) {
            const batch = batchEntities.find((b) => b.reference === ref);
            if (batch) {
                await this.batchRepository.allocate(batch, orderLine);
                console.log('allocated');
            }
        }
    }

    async save(batch: Batch): Promise<void> {
        await this.batchRepository.save(batch);
    }

    async findOne(
        options: FindOneOptions<BatchEntity>,
    ): Promise<Batch | undefined> {
        const batchEntity = await this.batchRepository.findOne(options);
        if (batchEntity) {
            return batchEntity.toModel();
        }
    }

    async find(options: FindManyOptions<IBatch>): Promise<Batch[]> {
        const batchEntities = await this.batchRepository.find(options);
        return batchEntities.map((b) => b.toModel());
    }

    async remove(batches: BatchEntity[]): Promise<void> {
        await this.batchRepository.remove(batches);
    }

    async count(options: FindManyOptions<IBatch>): Promise<number> {
        return this.batchRepository.count(options);
    }
}
