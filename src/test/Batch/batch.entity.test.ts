import { expect } from 'chai';
import { BatchEntity } from '$batch/model';
import { SqliteDataSource } from '$lib/datasource';
import { TransactionalTestContext, transactionalContext } from '$test/setup';

describe('Batch ORM', function () {
    let batch: BatchEntity;
    let ctx: TransactionalTestContext;

    this.beforeAll(async function () {
        ctx = await transactionalContext.get(SqliteDataSource);
    });

    this.beforeEach(async function () {
        batch = new BatchEntity(
            'batch-001',
            'SMALL-TABLE',
            20,
            new Date(2020, 1, 1),
        );
        await ctx.start();
    });

    this.afterEach(async function () {
        await ctx.finish();
    });

    it('can save a batch', async function () {
        const res = await ctx.manager.save(batch);
        const result = await ctx.manager.findOne(BatchEntity, {
            where: { reference: 'batch-001' },
        });
        expect(result).to.exist;
        expect(res?.equals(result as BatchEntity)).to.equal(true);
    });
});
