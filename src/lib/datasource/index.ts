import { DataSource } from 'typeorm';
import { BatchEntity } from '$batch/model';
import { OrderLineEntity } from '$orderline/model';

const PostgresDataSource = new DataSource({
    type: 'postgres',
    host: String(process.env.DB_HOST),
    port: Number(process.env.DB_PORT),
    username: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    database: String(process.env.DB_DATABASE),
    entities: [BatchEntity, OrderLineEntity],
    migrations: [String(process.env.MIGRATION_DIR) + '*{.js,.ts}'],
});

const SqliteDataSource = new DataSource({
    type: 'sqlite',
    database: String(process.env.DB_CONNECTION_STRING),
    entities: [BatchEntity, OrderLineEntity],
    migrations: [String(process.env.MIGRATION_DIR) + '*{.js,.ts}'],
});

export { SqliteDataSource, PostgresDataSource };
