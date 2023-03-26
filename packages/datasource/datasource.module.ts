import { EnvironmentSingleton } from '@/environment/environment.singleton';
import { DataSource } from 'typeorm';
import { registry } from 'tsyringe';

let PostgresDataSource: DataSource;

@registry([
    {
        token: 'PostgresDataSource',
        useFactory(dependencyContainer) {
            if (PostgresDataSource) return PostgresDataSource;

            const env = dependencyContainer.resolve(EnvironmentSingleton);
            PostgresDataSource = new DataSource({
                ...env.pgEnv,
                entities: dependencyContainer.resolve('PostgresEntities'),
            });
            return PostgresDataSource;
        },
    },
])
export class DataSourceModule {}
