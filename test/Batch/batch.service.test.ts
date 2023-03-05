import { expect } from 'chai';
import { container, DependencyContainer } from 'tsyringe';
import { Batch, allocate, OrderLine } from '$model/index';
import { BatchService } from '$service/index';
import { TestModule } from '$test/setup.js';
import { FakeBatchUnitOfWork } from '$test/fakes/batch.uow.js';
import { UoW } from '$/types/index.js';

describe('Batch Service', function () {
    describe('db uow', function () {
        let batchService: BatchService;
        let testContainer: DependencyContainer;
        let uow: UoW;

        this.beforeAll(async function () {
            await TestModule.bootstrap();
        });

        this.beforeEach(async function () {
            testContainer = container.createChildContainer();
            batchService = testContainer.resolve(BatchService);
            uow = testContainer.resolve<UoW>('BatchUoW');
            if (uow.init) {
                await uow.init();
            }
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
            const [found] = await batchService.find({
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
            expect(uow.state).to.deep.equal(['connected', 'init']);
            await uow.rollback();
            await testContainer.dispose();
            expect(uow.state).to.deep.equal([
                'released',
                'rolledback',
                'connected',
                'init',
            ]);
        });
    });

    describe('fake uow', function () {
        let batchService: BatchService;
        let testContainer: DependencyContainer;
        let batch: Batch;

        this.beforeAll(async function () {
            await TestModule.bootstrap();
        });

        this.beforeEach(async function () {
            batch = new Batch('batch-001', 'SMALL-TABLE', 20, new Date());
            testContainer = container.createChildContainer();
            testContainer.register('BatchUoW', {
                useClass: FakeBatchUnitOfWork,
            });
            testContainer.register('FakeBatches', {
                useValue: [batch],
            });
            batchService = testContainer.resolve(BatchService);
        });

        it('can allocate to a batch', async function () {
            // we should be able to allocate to the batch
            const orderLine = new OrderLine('SMALL-TABLE', 20);
            const ref = allocate(orderLine, [batch]);
            expect(ref).to.equal(batch.reference);

            // test the service will allocate to the batch
            await batchService.allocateOrderline(orderLine);
            // had problems with findOne typeorm method, so using find instead
            const [found] = await batchService.find({
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
            const uow = testContainer.resolve<UoW>('BatchUoW');
            expect(uow.state).to.deep.equal(['connected', 'init']);
            await testContainer.dispose();
            expect(uow.state).to.deep.equal([
                'released',
                'committed',
                'connected',
                'init',
            ]);
        });
    });
});
