import { UoW, workState } from '$/types/index';
import { DataSource, QueryRunner } from 'typeorm';

export abstract class AbstractTypeormUnitOfWork implements UoW {
    queryRunner: QueryRunner;

    constructor(
        private readonly dataSource: DataSource,
        public state: workState[],
        public errors: Error[],
    ) {
        this.state.unshift('init');
        this.queryRunner = this.dataSource.createQueryRunner();
    }

    async rollback() {
        if (!(this.queryRunner && this.connected)) {
            return;
        }
        await this.queryRunner.rollbackTransaction();
        this.state.unshift('rolledback');
    }

    async commit() {
        if (!(this.queryRunner && this.connected)) {
            return;
        }
        await this.queryRunner.commitTransaction();
        this.state.unshift('committed');
    }

    async release() {
        if (!(this.queryRunner && this.connected)) {
            return;
        }
        await this.queryRunner.release();
        this.state.unshift('released');
    }

    async dispose() {
        if (!(this.queryRunner && this.connected)) {
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
    async init() {
        if (!this.queryRunner) {
            throw new Error('QueryRunner is not defined');
        }

        if (this.released || this.committed || this.rolledback) {
            throw new Error('UnitOfWork is already disposed');
        }

        if (!this.connected) {
            await this.queryRunner.connect();
            await this.queryRunner.startTransaction();
        }
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
}
