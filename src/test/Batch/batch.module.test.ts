import { registry } from 'tsyringe';
import { SqliteDataSource } from '$lib/datasource';
import { DataSource } from 'typeorm';

@registry([
    {
        token: DataSource,
        useValue: SqliteDataSource,
    },
])
export class BatchModule {}
