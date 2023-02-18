import { expect } from 'chai';
import { container } from 'tsyringe';
import { Batch, allocate, OrderLine } from '$model/index';
import { BatchService } from '$service/index';
import { BatchRepository } from '$repository/index';
import { TestModule } from '$test/setup.js';
import { TransactionalTestContext } from '$test/TransactionalTestContext.js';

describe.only('Batch Service', function () {
    let ctx: TransactionalTestContext;
    let batchService: BatchService;
    let batchRepository: BatchRepository;

    this.beforeAll(async function () {
        await TestModule.bootstrap();
    });

    this.beforeEach(async function () {
        batchService = container.resolve(BatchService);
        batchRepository = container.resolve(BatchRepository);
        ctx = container.resolve(TransactionalTestContext);
        await ctx.start();
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
});
