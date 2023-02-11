import 'reflect-metadata';
import { inject, registry, singleton } from 'tsyringe';
import dotenv from 'dotenv';
import { DataSource, QueryRunner } from 'typeorm';
import { SqliteDataSource } from '$lib/datasource';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), 'config', 'test.env') });

// https://github.com/viniciusjssouza/typeorm-transactional-tests

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
    private queryRunner: QueryRunnerWrapper | null = null;
    private originQueryRunnerFunction: any;
    private ready: any;
    constructor(@inject(DataSource) private readonly connection: DataSource) {
        this.ready = this.init().catch(() => {
            throw new Error('Could not initialize database connection');
        });
    }

    private async init(): Promise<void> {
        if (this.ready) {
            return;
        }
        return new Promise((resolve) => {
            return this.connection
                .initialize()
                .then(() => this.connection.runMigrations())
                .then(() => resolve());
        });
    }

    get manager() {
        return this.connection.manager;
    }

    async start(): Promise<void> {
        await this.ready;

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
