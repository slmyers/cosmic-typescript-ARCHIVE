import { DataSource, QueryRunner } from 'typeorm';
import { interpret } from 'xstate';
import { BaseUnitOfWork } from './base.unitofwork.js';
import machineFactory from './machine.unitofwork.factory';

export abstract class AbstractTypeormUnitOfWork extends BaseUnitOfWork {
    baseService: any;
    queryRunner: QueryRunner;

    constructor(private readonly dataSource: DataSource) {
        super();
        this.queryRunner = this.dataSource.createQueryRunner();
    }

    async init(): Promise<void> {
        this.baseService = interpret(
            machineFactory(this.id, { actions: this.actions }),
        ).start();
        await this.queryRunner.connect();
        await super.init();
    }

    private get actions() {
        return {
            init: () => {
                // console.log('init', this.id);
            },
            connect: async () => {
                // console.log('connect', this.id);
                await this.queryRunner.startTransaction();
            },
            commit: async () => {
                // console.log('commit', this.id);
                await this.queryRunner.commitTransaction();
            },
            rollback: async () => {
                // console.log('rollback', this.id);
                await this.queryRunner.rollbackTransaction();
            },
            release: async () => {
                // console.log('release', this.id);
                await this.queryRunner.release();
            },
        };
    }
}
