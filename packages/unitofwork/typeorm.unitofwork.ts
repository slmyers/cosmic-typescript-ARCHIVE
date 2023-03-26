import { UoW, workState } from '$/types/index';
import { randomUUID } from 'crypto';
import { DataSource, QueryRunner } from 'typeorm';

export abstract class AbstractTypeormUnitOfWork implements UoW {
    queryRunner: QueryRunner;
    id;
    validations: (() => Promise<void>)[] = [];

    constructor(
        private readonly dataSource: DataSource,
        public state: workState[],
        public errors: Error[],
    ) {
        this.state.unshift('init');
        this.queryRunner = this.dataSource.createQueryRunner();
        this.id = randomUUID();
        this.validations = [];
        // console.log('creating...', this.id);
    }

    async rollback() {
        // console.log('rolling back...', this.id);
        if (!(this.queryRunner && this.connected)) {
            return;
        }
        await this.queryRunner.rollbackTransaction();
        this.state.unshift('rolledback');
    }

    async commit() {
        // console.log('commit called...', this.id, this.state, this.errors);
        if (!(this.queryRunner && this.connected)) {
            await this.init();
        }
        await this.queryRunner.commitTransaction();
        this.state.unshift('committed');
        // console.log('commiting...', this.id);
    }

    async release() {
        if (!(this.queryRunner && this.connected)) {
            return;
        }
        await this.queryRunner.release();
        this.state.unshift('released');
        // console.log('releasing...', this.id);
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
        } else if (this.queryRunner.isTransactionActive) {
            await this.commit();
        }

        if (!this.released && this.connected) {
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
            // console.log('connecting...', this.id);
        } else {
            // console.log('already connected! ', this.id);
        }

        if (!this.queryRunner.isTransactionActive) {
            await this.queryRunner.startTransaction();
            // console.log('starting transaction...', this.id);
        } else {
            // console.log('already in a transaction!', this.id);
        }

        if (this.queryRunner.isTransactionActive) {
            this.state.unshift('connected');
        }
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

    addCommitValidation(validation: () => Promise<void>) {
        this.validations.push(validation);
    }

    getState() {
        return [this.id, ...this.state];
    }
}
