// exports a unit of work for batch repository

import { BatchRepository } from './batch.repository';
import { DataSource } from 'typeorm';
import { Lifecycle, scoped } from 'tsyringe';
import { inject } from 'tsyringe';
import { IBatch, IOrderLine } from '$/model/index.js';
import { BatchRepo } from '$/types/index.js';
import { AbstractTypeormUnitOfWork } from '@/unitofwork/typeorm.unitofwork';

@scoped(Lifecycle.ContainerScoped)
export class BatchUnitOfWork extends AbstractTypeormUnitOfWork {
    batchRepository!: BatchRepo;

    constructor(
        @inject(DataSource)
        dataSource: DataSource,
    ) {
        super(dataSource, [], []);
        this.batchRepository = new BatchRepository(this.queryRunner);
    }

    async allocate(batch: IBatch, orderLine: IOrderLine): Promise<IOrderLine> {
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
