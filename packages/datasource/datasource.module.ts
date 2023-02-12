import { EnvironmentService } from '@/environment/environment.service';
import { DataSource } from 'typeorm';
import { BatchEntity } from '$entity/batchentity';
import { OrderLineEntity } from '$entity/orderlineentity';
import { registry } from 'tsyringe';

let PostgresDataSource: DataSource;
let SqliteDataSource: DataSource;

@registry([
    {
        token: 'PostgresDataSource',
        useFactory(dependencyContainer) {
            if (PostgresDataSource) return PostgresDataSource;

            const env = dependencyContainer.resolve(EnvironmentService);
            PostgresDataSource = new DataSource({
                ...env.pgEnv,
                entities: [BatchEntity, OrderLineEntity],
            });
            return PostgresDataSource;
        },
    },
    {
        token: 'SqliteDataSource',
        useFactory(dependencyContainer) {
            if (SqliteDataSource) return SqliteDataSource;

            const env = dependencyContainer.resolve(EnvironmentService);
            SqliteDataSource = new DataSource({
                ...env.sqliteEnv,
                entities: [BatchEntity, OrderLineEntity],
            });
            return SqliteDataSource;
        },
    },
])
export class DataSourceModule {}
