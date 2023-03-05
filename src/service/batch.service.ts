import { allocate, Batch, IBatch } from '$/model/index.js';
import { IOrderLine } from '$/model/orderline.model.js';
import { BatchEntity } from '$/repository/index';
import { BatchRepo, BatchUoW } from '$/types/index.js';
import { inject, injectable } from 'tsyringe';
import { FindManyOptions } from 'typeorm';

@injectable()
export class BatchService {
    batchRepository!: BatchRepo;
    constructor(
        @inject('BatchUoW')
        private readonly batchUnitOfWork: BatchUoW,
    ) {
        this.batchRepository = this.batchUnitOfWork.batchRepository;
    }

    async allocateOrderline(orderLine: IOrderLine): Promise<string> {
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
                await this.batchUnitOfWork.allocate(batch, orderLine);
            }
        }

        return ref;
    }

    async save(batch: Batch): Promise<void> {
        await this.batchRepository.save(batch);
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
