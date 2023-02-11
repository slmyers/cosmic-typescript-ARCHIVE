import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource, QueryRunner } from 'typeorm';
import { SqliteDataSource } from '../lib';

// TODO: the build process should put a .env file in the root of the build directory
dotenv.config({ path: __dirname + '/../../../config/test.env' });

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

export class TransactionalTestContext {
    private queryRunner: QueryRunnerWrapper | null = null;
    private originQueryRunnerFunction: any;
    constructor(private readonly connection: DataSource) {}

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

class TransactionalTestContextManager {
    private static instance: TransactionalTestContextManager;

    private contexts: Map<DataSource, TransactionalTestContext> = new Map();

    static getInstance(): TransactionalTestContextManager {
        if (!TransactionalTestContextManager.instance) {
            TransactionalTestContextManager.instance =
                new TransactionalTestContextManager();
        }

        return TransactionalTestContextManager.instance;
    }

    async getContext(
        connection: DataSource,
    ): Promise<TransactionalTestContext> {
        if (!this.contexts.has(connection)) {
            await connection.initialize();
            await connection.runMigrations();
            this.contexts.set(
                connection,
                new TransactionalTestContext(connection),
            );
        }

        return this.contexts.get(connection) as TransactionalTestContext;
    }
}

// enforce singleton
export const transactionalContext = {
    get: TransactionalTestContextManager.getInstance().getContext.bind(
        TransactionalTestContextManager.getInstance(),
    ),
};

// export const datasource: Promise<DataSource> = new Promise(
//     (resolve, reject) => {
//         SqliteDataSource.initialize()
//             .then((dataSource) => {
//                 return dataSource.runMigrations().then((migrations) => {
//                     console.log('ran migrations');
//                     console.log(migrations);
//                     return resolve(dataSource);
//                 });
//             })
//             .catch((error: any) => {
//                 return reject(error);
//             });
//     },
// );
