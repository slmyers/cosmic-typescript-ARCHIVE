import { expect } from 'chai';
import { container } from 'tsyringe';
import { BatchRepository } from '$/repository/index';
import { allocate, Batch, OrderLine } from '$/model/index';
import { TransactionalTestContext } from '$test/TransactionalTestContext';
import { TestModule } from '$test/setup';
import { DataSource } from 'typeorm';

describe.only('Batch Repository', function () {
    let ctx: TransactionalTestContext;
    let batchRepository: BatchRepository;

    this.beforeAll(async function () {
        await TestModule.bootstrap();
    });

    this.beforeEach(async function () {
        ctx = container.resolve(TransactionalTestContext);
        const dataSource = container.resolve(DataSource);
        await ctx.start();
        batchRepository = new BatchRepository(dataSource.createQueryRunner());
    });

    it('can save a batch', async function () {
        const batch = new Batch('batch-001', 'SMALL-TABLE', 20, new Date());
        await batchRepository.save(batch);
        const found = await batchRepository.findOne({
            where: { reference: batch.reference },
        });
        expect(found).to.not.be.null;
        expect(found?.reference).to.equal(batch.reference);
    });

    it('can find a batch by reference', async function () {
        const batch = new Batch('batch-001', 'SMALL-TABLE', 20, new Date());
        await batchRepository.save(batch);
        const found = await batchRepository.findOne({
            where: { reference: batch.reference },
        });
        expect(found).to.not.be.null;
        expect(found?.reference).to.equal(batch.reference);
    });

    it('returns null if no batch found', async function () {
        const found = await batchRepository.findOne({
            where: { reference: 'batch-001' },
        });
        expect(found).to.be.null;
    });

    it('can allocate to a batch', async function () {
        const batch = new Batch('batch-001', 'SMALL-TABLE', 20, new Date());
        await batchRepository.save(batch);
        const orderLine = new OrderLine('SMALL-TABLE', 20);
        const ref = allocate(orderLine, [batch]);
        expect(ref).to.equal(batch.reference);
        await batchRepository.allocate(batch, orderLine);
        const found = await batchRepository.findOne({
            where: { reference: batch.reference },
            relations: {
                orderLines: true,
            },
        });
        if (!found) {
            throw new Error('Batch not found');
        }

        const model = new Batch(
            found.reference,
            found.sku,
            found.quantity,
            found.eta,
            found.orderLines,
        );

        expect(model.equals(batch)).to.be.true;
    });

    this.afterEach(async function () {
        await ctx.finish();
    });
});
