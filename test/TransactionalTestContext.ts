// https://github.com/viniciusjssouza/typeorm-transactional-tests

import { singleton, inject } from 'tsyringe';
import { QueryRunner, DataSource } from 'typeorm';

/**
 * Wraps the original TypeORM query runner to intercept some calls
 * and manipulate the transactional context.
 */
interface QueryRunnerWrapper extends QueryRunner {
    releaseQueryRunner(): Promise<void>;
}

let release: () => Promise<void>;

const wrap = (originalQueryRunner: QueryRunner): QueryRunnerWrapper => {
    release = originalQueryRunner.release;
    originalQueryRunner.release = () => {
        return Promise.resolve();
    };

    (originalQueryRunner as QueryRunnerWrapper).releaseQueryRunner = () => {
        originalQueryRunner.release = release;
        return originalQueryRunner.release();
    };

    return originalQueryRunner as QueryRunnerWrapper;
};

@singleton()
export class TransactionalTestContext {
    public queryRunner: QueryRunnerWrapper | null = null;
    private originQueryRunnerFunction: any;
    constructor(@inject(DataSource) private readonly connection: DataSource) {}

    get manager() {
        return this.connection.manager;
    }

    async start(): Promise<void> {
        if (this.queryRunner) {
            throw new Error('Context already started');
        }
        try {
            this.queryRunner = this.buildWrappedQueryRunner();
            this.monkeyPatchQueryRunnerCreation(this.queryRunner);

            await this.queryRunner.connect();
            await this.queryRunner.startTransaction();
        } catch (error) {
            await this.cleanUpResources();
            throw error;
        }
    }

    async finish(): Promise<void> {
        if (!this.queryRunner) {
            throw new Error(
                'Context not started. You must call "start" before finishing it.',
            );
        }
        try {
            await this.queryRunner.rollbackTransaction();
            this.restoreQueryRunnerCreation();
        } finally {
            await this.cleanUpResources();
        }
    }

    private buildWrappedQueryRunner(): QueryRunnerWrapper {
        const queryRunner = this.connection.createQueryRunner();
        return wrap(queryRunner);
    }

    private monkeyPatchQueryRunnerCreation(
        queryRunner: QueryRunnerWrapper,
    ): void {
        this.originQueryRunnerFunction = DataSource.prototype.createQueryRunner;
        DataSource.prototype.createQueryRunner = () => queryRunner;
    }

    private restoreQueryRunnerCreation(): void {
        DataSource.prototype.createQueryRunner = this.originQueryRunnerFunction;
    }

    private async cleanUpResources(): Promise<void> {
        if (this.queryRunner) {
            await this.queryRunner.releaseQueryRunner();
            this.queryRunner = null;
        }
    }
}
