import '$batch/batch.module';
import '$lib/datasource/datasource.module';
import { TransactionalTestContext } from './TransactionalTestContext';
import { registry } from 'tsyringe';
import { DataSource } from 'typeorm';

@registry([
    {
        token: DataSource,
        useToken: 'PostgresDataSource',
    },
    {
        token: TransactionalTestContext,
        useClass: TransactionalTestContext,
    },
])
export class TestModule {}
