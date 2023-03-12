import 'reflect-metadata';
import '@/datasource/datasource.module';
import path from 'path';
import { TransactionalTestContext } from './TransactionalTestContext';
import { container, registry } from 'tsyringe';
import { DataSource, EntityManager } from 'typeorm';
import {
    BatchEntity,
    OrderLineEntity,
    BatchUnitOfWork,
    ProductUnitOfWork,
    ProductEntity,
} from '$/repository/index';

@registry([
    {
        token: 'PostgresEntities',
        useValue: [BatchEntity, OrderLineEntity, ProductEntity],
    },
    {
        token: 'SqliteEntities',
        useValue: [BatchEntity, OrderLineEntity, ProductEntity],
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
    {
        token: EntityManager,
        useFactory(dependencyContainer) {
            return dependencyContainer.resolve(DataSource).manager;
        },
    },
    {
        token: 'BatchUoW',
        useClass: BatchUnitOfWork,
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
