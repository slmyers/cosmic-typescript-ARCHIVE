import { expect } from 'chai';
import { BatchEntity, allocate } from '$batch/model';
import { TransactionalTestContext } from '$test/TransactionalTestContext.js';
import { container } from 'tsyringe';
import { OrderLineEntity } from '$/lib/batch/orderline/model/entity.js';
import { DataSource } from 'typeorm';

describe('Batch Entity', function () {
    const dataSource: DataSource = container.resolve(DataSource);
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

    // this test doesn't have lots of value mostly used for debugging
    it('can allocate from a batch', async function () {
        batch = await ctx.manager.save(batch);
        let line = new OrderLineEntity('SMALL-TABLE', 10);

        const ref = allocate(line, [batch]);
        expect(ref).to.equal('batch-001');
        line.batchId = batch.id as number;
        line = await ctx.manager.save(line);
        const result = await ctx.manager.findOne(BatchEntity, {
            where: { reference: 'batch-001' },
            relations: {
                orderLines: true,
            },
        });

        const orderLine = await ctx.manager.findOne(OrderLineEntity, {
            where: { reference: line.reference },
        });

        expect(result).to.exist;
        expect(result?.orderLines?.length).to.equal(1);
        expect(result?.orderLines?.[0].reference).to.equal(
            orderLine?.reference,
        );
    });
});
