import { BatchEntity, OrderLineEntity } from '$entity/index';
import { BatchService } from '$service/index';
import { container } from 'tsyringe';
import { expect } from 'chai';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionalTestContext } from '$test/TransactionalTestContext.js';

describe('Batch Service', function () {
    describe('integration', function () {
        let batchService: BatchService;
        let manager: EntityManager;
        let ctx: TransactionalTestContext;

        this.beforeEach(async function () {
            batchService = container.resolve(BatchService);
            const dataSource = container.resolve(DataSource);
            manager = dataSource.manager;
            ctx = container.resolve(TransactionalTestContext);
            await ctx.start();
        });

        this.afterEach(async function () {
            await ctx.finish();
        });

        it('should allocate to a batch', async function () {
            const batch = new BatchEntity(
                'batch-001',
                'SMALL-TABLE',
                20,
                new Date(2020, 1, 1),
            );
            await manager.save(batch);
            expect(batch.quantity).to.equal(20);

            const line = new OrderLineEntity('SMALL-TABLE', 10);
            const res = await batchService.allocate(line);
            expect(res).to.exist;
            expect(res.reference).to.equal('batch-001');
            expect(res.quantity).to.equal(10);
            expect(res.orderLines?.length).to.equal(1);
            expect(res.orderLines?.[0].reference).to.equal(line.reference);

            const result = await manager.findOne(BatchEntity, {
                where: { reference: 'batch-001' },
                relations: {
                    orderLines: true,
                },
            });
            expect(result).to.exist;
            expect(result?.orderLines?.length).to.equal(1);
            expect(result?.orderLines?.[0].reference).to.equal(line.reference);
        });

        it('should throw an error if no batch is available', async function () {
            const line = new OrderLineEntity('SMALL-TABLE', 10);
            try {
                await batchService.allocate(line);
            } catch (e: any) {
                expect(e.message).to.equal('No batch available');
            }
        });
    });
});
