import { DataSource } from 'typeorm';
import { BatchEntity } from '$batch/model';
import { OrderLineEntity } from '$orderline/model';
import { registry } from 'tsyringe';
import { EnvironmentService } from '$lib/environment/environment.service.js';

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
