import { EnvironmentSingleton } from '@/environment/environment.singleton';
import { DataSource } from 'typeorm';
import { registry } from 'tsyringe';

let PostgresDataSource: DataSource;
let SqliteDataSource: DataSource;

@registry([
    {
        token: 'PostgresDataSource',
        useFactory(dependencyContainer) {
            if (PostgresDataSource) return PostgresDataSource;

            const env = dependencyContainer.resolve(EnvironmentSingleton);
            PostgresDataSource = new DataSource({
                ...env.pgEnv,
                entities: dependencyContainer.resolve('PostgresEntities'),
                // logging: true,
            });
            return PostgresDataSource;
        },
    },
    {
        token: 'SqliteDataSource',
        useFactory(dependencyContainer) {
            if (SqliteDataSource) return SqliteDataSource;

            const env = dependencyContainer.resolve(EnvironmentSingleton);
            SqliteDataSource = new DataSource({
                ...env.sqliteEnv,
                entities: dependencyContainer.resolve('SqliteEntities'),
                // logging: true,
            });
            return SqliteDataSource;
        },
    },
])
export class DataSourceModule {}
