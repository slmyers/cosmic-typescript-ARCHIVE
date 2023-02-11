import { DataSource } from 'typeorm';
import { Batch, OrderLine } from '../model';
import { TransactionContext } from './TransactionContext.js';

const PostgresDataSource = new DataSource({
    type: 'postgres',
    host: String(process.env.DB_HOST),
    port: Number(process.env.DB_PORT),
    username: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    database: String(process.env.DB_DATABASE),
    entities: [Batch, OrderLine],
    migrations: [String(process.env.MIGRATION_DIR) + '*{.js,.ts}'],
});

const SqliteDataSource = new DataSource({
    type: 'sqlite',
    database: String(process.env.DB_CONNECTION_STRING),
    entities: [Batch, OrderLine],
    migrations: [String(process.env.MIGRATION_DIR) + '*{.js,.ts}'],
});

export { SqliteDataSource, PostgresDataSource, TransactionContext };
