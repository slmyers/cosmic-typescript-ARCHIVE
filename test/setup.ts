import 'reflect-metadata';
import '@/datasource/datasource.module';
import path from 'path';
import { TransactionalTestContext } from './TransactionalTestContext';
import { container, registry } from 'tsyringe';
import { DataSource, EntityManager } from 'typeorm';
import { ProductUnitOfWork, ProductEntity } from '$/repository/index';

@registry([
    {
        token: 'PostgresEntities',
        useValue: [ProductEntity],
    },
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
        token: 'env.override',
        useValue: new Map(),
    },
    {
        token: DataSource,
        useToken: 'PostgresDataSource',
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
    {
        token: EntityManager,
        useFactory(dependencyContainer) {
            return dependencyContainer.resolve(DataSource).manager;
        },
    },
    {
        token: 'ProductUoW',
        useClass: ProductUnitOfWork,
    },
])
class Module {
    async bootstrap() {
        const init = container.resolve<() => Promise<void>>('init');
        await init();
    }
}

export const TestModule = new Module();
