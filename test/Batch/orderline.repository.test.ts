import {
    OrderLineRepository,
    OrderLineEntity,
    BatchRepository,
    BatchEntity,
} from '$repository/index';
import { expect } from 'chai';
import { container } from 'tsyringe';
import { DataSource } from 'typeorm';
import { TransactionalTestContext } from '$test/TransactionalTestContext.js';
import { TestModule } from '$test/setup';

describe('OrderLine Repository', function () {
    const dataSource: DataSource = container.resolve(DataSource);
    let ctx: TransactionalTestContext;
    let orderLineRepository: OrderLineRepository;
    let batchRepository: BatchRepository;

    this.beforeAll(async function () {
        await TestModule.bootstrap();
    });

    this.beforeEach(async function () {
        orderLineRepository = new OrderLineRepository(dataSource.manager);
        batchRepository = new BatchRepository(dataSource.manager);
        ctx = container.resolve(TransactionalTestContext);
        await ctx.start();
    });

    it('can save an order line', async function () {
        const batch = new BatchEntity({
            reference: 'batch-001',
            sku: 'SMALL-TABLE',
            quantity: 20,
            eta: new Date(),
        });
        const { id: batchId } = await batchRepository.save(batch);
        const orderLine = new OrderLineEntity({
            reference: 'orderline-001',
            sku: 'SMALL-TABLE',
            quantity: 20,
            batchId: batchId,
        });
        await orderLineRepository.save(orderLine);
        const foundOrder = await orderLineRepository.findOne({
            where: { batchId },
        });
        expect(foundOrder).to.not.be.null;
        expect(foundOrder?.reference).to.equal(orderLine.reference);
        expect(foundOrder?.batchId).to.equal(batchId);

        const foundBatch = await batchRepository.findOne({
            where: { id: batchId },
            relations: {
                orderLines: true,
            },
        });

        expect(foundBatch).to.not.be.null;
        expect(foundBatch?.orderLines).to.not.be.empty;
        const foundOrderLine = foundBatch?.orderLines[0];
        expect(foundOrderLine?.reference).to.equal(orderLine.reference);
    });

    it('returns null if no order line found', async function () {
        const found = await orderLineRepository.findOne({
            where: { reference: 'orderline-001' },
        });
        expect(found).to.be.null;
    });

    this.afterEach(async function () {
        await ctx.finish();
    });
});
