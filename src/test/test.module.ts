import '$batch/batch.module';
import '$lib/datasource/datasource.module';
import { TransactionalTestContext } from './TransactionalTestContext';
import { container, registry } from 'tsyringe';
import { DataSource } from 'typeorm';

@registry([
    {
        token: DataSource,
        useToken: 'SqliteDataSource',
    },
    {
        token: TransactionalTestContext,
        useClass: TransactionalTestContext,
    },
    {
        token: 'init',
        useFactory: () => {
            const dataSource = container.resolve(DataSource);
            const init = async () => {
                if (dataSource.isInitialized) return;

                await dataSource.initialize();
                await dataSource.runMigrations();
            };
            return init;
        },
    },
])
export class TestModule {}
