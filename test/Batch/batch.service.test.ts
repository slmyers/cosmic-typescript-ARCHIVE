import { expect } from 'chai';
import { container, DependencyContainer } from 'tsyringe';
import { Batch, allocate, OrderLine } from '$model/index';
import { BatchService } from '$service/index';
import { TestModule } from '$test/setup.js';
import { TransactionalTestContext } from '$test/TransactionalTestContext.js';

describe('Batch Service', function () {
    let ctx: TransactionalTestContext;
    let batchService: BatchService;
    let testContainer: DependencyContainer;

    this.beforeAll(async function () {
        await TestModule.bootstrap();
    });

    this.beforeEach(async function () {
        ctx = container.resolve(TransactionalTestContext);
        await ctx.start();
        testContainer = container.createChildContainer();
        batchService = testContainer.resolve(BatchService);
    });

    it('can allocate to a batch', async function () {
        // create and save a batch
        const batch = new Batch('batch-001', 'SMALL-TABLE', 20, new Date());
        await batchService.save(batch);

        // we should be able to allocate to the batch
        const orderLine = new OrderLine('SMALL-TABLE', 20);
        const ref = allocate(orderLine, [batch]);
        expect(ref).to.equal(batch.reference);

        // test the service will allocate to the batch
        await batchService.allocateOrderline(orderLine);
        const found = await batchService.findOne({
            where: { reference: batch.reference },
            relations: {
                orderLines: true,
            },
        });
        if (!found) {
            throw new Error('Batch not found');
        }
        expect(found.equals(batch)).to.be.true;
    });

    this.afterEach(async function () {
        await ctx.finish();
        await testContainer.dispose();
    });
});
