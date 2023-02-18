// exports a unit of work for batch repository

import { BatchRepository, BatchEntity } from './batch.repository';
import { OrderLineEntity } from './orderline.repository';
import { DataSource, QueryRunner } from 'typeorm';
import { injectable, Lifecycle, scoped } from 'tsyringe';
import { inject } from 'tsyringe';
import { IOrderLine } from '$/model/index.js';

@scoped(Lifecycle.ContainerScoped)
export class BatchUnitOfWork {
    private initialized: Promise<boolean>;
    private queryRunner: QueryRunner | undefined;
    public batchRepository!: BatchRepository;
    private errors: Error[] = [];

    constructor(
        @inject(DataSource)
        private readonly dataSource: DataSource,
    ) {
        console.log('BatchUnitOfWork constructor');
        this.queryRunner = this.dataSource.createQueryRunner();
        this.batchRepository = new BatchRepository(this.queryRunner);
        this.initialized = this.init(this.queryRunner);
    }

    private async init(queryRunner: QueryRunner) {
        if (!this.dataSource.isInitialized) {
            await this.dataSource.initialize();
            await this.dataSource.runMigrations();
        }

        if (!this.initialized) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }
        return true;
    }

    async allocate(
        batch: BatchEntity,
        orderLine: IOrderLine,
    ): Promise<IOrderLine> {
        let result = null;

        if (!(this.queryRunner && this.batchRepository)) {
            throw new Error('Query runner not initialized');
        }

        const batchRepository = await this.batchRepository;

        try {
            result = await batchRepository.allocate(batch, orderLine);
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }

        return result;
    }

    async dispose() {
        console.log('BatchUnitOfWork dispose');
        if (!this.queryRunner) {
            return;
        }

        if (this.errors.length > 0) {
            console.log('rolled back!');
            await this.queryRunner.rollbackTransaction();
        } else {
            console.log('committed!');
            await this.queryRunner.commitTransaction();
        }

        await this.queryRunner.release();
    }
}
