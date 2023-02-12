import 'reflect-metadata';
import '@/datasource/datasource.module';
import path from 'path';
import { TransactionalTestContext } from './TransactionalTestContext';
import { container, registry } from 'tsyringe';
import { DataSource } from 'typeorm';

@registry([
    {
        token: 'env.path',
        useValue: path.join('/mnt/e/cosmic-typescript/', 'config', 'test.env'),
    },
    {
        token: 'shared.path',
        useValue: path.join(
            '/mnt/e/cosmic-typescript/',
            'config',
            'shared.env',
        ),
    },
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
