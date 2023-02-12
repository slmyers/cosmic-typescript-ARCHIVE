import { expect } from 'chai';
import { BatchEntity } from '$batch/model';
import { TransactionalTestContext } from '$test/TransactionalTestContext.js';
import { container } from 'tsyringe';
import { OrderLineEntity } from '$/lib/batch/orderline/model/entity.js';

describe('Batch Entity', function () {
    let batch: BatchEntity;
    let ctx: TransactionalTestContext;

    this.beforeEach(async function () {
        batch = new BatchEntity(
            'batch-001',
            'SMALL-TABLE',
            20,
            new Date(2020, 1, 1),
        );
        ctx = container.resolve(TransactionalTestContext);
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

    it('can allocate from a batch', async function () {
        batch.allocate(
            new OrderLineEntity('SMALL-TABLE', batch.availableQuantity),
        );
        const res = await ctx.manager.save(batch);
        const result = await ctx.manager.findOne(BatchEntity, {
            where: { reference: 'batch-001' },
        });
        expect(result).to.exist;
        expect(res?.equals(result as BatchEntity)).to.equal(true);
        console.log(res);
        console.log(result);
    });
});
