import { expect } from 'chai';
import { Batch, SqliteDataSource } from '$/lib';
import { TransactionalTestContext, transactionalContext } from '$test/setup.js';

describe('Batch ORM', function () {
    describe('orm', function () {
        let batch: Batch;
        let ctx: TransactionalTestContext;

        this.beforeAll(async function () {
            ctx = await transactionalContext.get(SqliteDataSource);
        });

        this.beforeEach(async function () {
            batch = new Batch(
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
            const result = await ctx.manager.findOne(Batch, {
                where: { reference: 'batch-001' },
            });
            expect(result).to.exist;
            expect(res?.equals(result as Batch)).to.equal(true);
        });
    });
});
