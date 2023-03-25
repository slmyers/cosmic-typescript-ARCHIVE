import { expect } from 'chai';
import { DependencyContainer, container } from 'tsyringe';
import { ProductService } from '$/service/index';
import { OrderLine } from '$/model/index';
import { TestModule } from '$test/setup';
import { UoW } from '$/types/index';
import { TransactionalTestContext } from '$test/TransactionalTestContext';
import { DataSource, QueryRunner } from 'typeorm';

describe('product service', function () {
    let productService: ProductService;
    let testContainer: DependencyContainer;
    let uow: UoW;
    let ctx: TransactionalTestContext;
    let queryRunner: QueryRunner;
    let batchId: number;

    this.beforeAll(async function () {
        await TestModule.bootstrap();
    });

    describe('db pessimistic concurrency control', function () {
        let testContainer2: DependencyContainer;
        let productService2: ProductService;

        this.beforeAll(async function () {
            const dataSource: DataSource = container.resolve(DataSource);
            queryRunner = dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            const p = await queryRunner.query(
                "INSERT INTO product (sku, version) VALUES ('SMALL-TABLE', 1) RETURNING id",
            );

            const b = await queryRunner.query(
                "INSERT INTO batch (reference, sku, quantity, eta, \"productId\") VALUES ('batch-001', 'SMALL-TABLE', 20, '2021-01-01', $1) RETURNING id",
                [Array.isArray(p) ? p[0].id : p],
            );

            await queryRunner.commitTransaction();
        });

        this.beforeEach(async function () {
            testContainer = container.createChildContainer();
            testContainer2 = container.createChildContainer();

            productService = testContainer.resolve(ProductService);
            productService2 = testContainer2.resolve(ProductService);

            await productService.unitOfWork.init();
            await productService2.unitOfWork.init();
        });

        it('can not allocate to the same product from different processes', async function () {
            const refs = await Promise.all([
                productService
                    .allocate(new OrderLine('SMALL-TABLE', 10, 'order1'))
                    .then(async (ref) => {
                        await productService.unitOfWork.dispose();
                        return ref;
                    }),
                productService2
                    .allocate(new OrderLine('SMALL-TABLE', 15, 'order2'))
                    .catch(async (e: any) => {
                        await productService2.unitOfWork.dispose();
                        return e.message;
                    }),
            ]);
            expect(refs.includes('batch-001')).to.be.true;
            expect(refs.includes('Out of stock for sku SMALL-TABLE')).to.be
                .true;

            expect(productService.unitOfWork.getState().includes('committed'));
            expect(
                productService2.unitOfWork.getState().includes('rolledback'),
            );

            const orders = await queryRunner.query('SELECT * FROM order_line');
            expect(orders.length).to.equal(1);
            const [order] = orders;
            expect({
                sku: order.sku,
                quantity: order.quantity,
                reference: order.reference,
            }).to.deep.equal({
                sku: 'SMALL-TABLE',
                quantity: 10,
                reference: 'order1',
            });
        });

        it('can not allocate to the same product from different processes x2', async function () {
            const refs = await Promise.all([
                productService2
                    .allocate(new OrderLine('SMALL-TABLE', 15, 'order3'))
                    .catch(async (e: any) => {
                        await productService2.unitOfWork.dispose();
                        return e.message;
                    }),
                productService
                    .allocate(new OrderLine('SMALL-TABLE', 5, 'order4'))
                    .then(async (ref) => {
                        await productService.unitOfWork.dispose();
                        return ref;
                    }),
            ]);
            expect(refs.includes('batch-001')).to.be.true;
            expect(refs.includes('Out of stock for sku SMALL-TABLE')).to.be
                .true;

            expect(productService.unitOfWork.getState().includes('committed'));
            expect(
                productService2.unitOfWork.getState().includes('rolledback'),
            );

            const orders = await queryRunner.query(
                'SELECT * FROM order_line ORDER BY id',
            );
            expect(orders.length).to.equal(2);
            const [, order] = orders;
            expect({
                sku: order.sku,
                quantity: order.quantity,
                reference: order.reference,
            }).to.deep.equal({
                sku: 'SMALL-TABLE',
                quantity: 5,
                reference: 'order4',
            });
        });

        this.afterEach(async function () {
            await testContainer.dispose();
            await testContainer2.dispose();
        });

        this.afterAll(async function () {
            await queryRunner.startTransaction();
            await queryRunner.query('DELETE FROM order_line');
            await queryRunner.query('DELETE FROM batch');
            await queryRunner.query('DELETE FROM product');
            await queryRunner.commitTransaction();
            await queryRunner.release();
        });
    });

    describe('db uow', function () {
        this.beforeEach(async function () {
            testContainer = container.createChildContainer();
            ctx = container.resolve(TransactionalTestContext);
            await ctx.start();
            const dataSource: DataSource = container.resolve(DataSource);
            queryRunner = dataSource.createQueryRunner();
            const p = await queryRunner.query(
                "INSERT INTO product (sku, version) VALUES ('SMALL-TABLE', 1) RETURNING id",
            );

            const b = await queryRunner.query(
                "INSERT INTO batch (reference, sku, quantity, eta, \"productId\") VALUES ('batch-001', 'SMALL-TABLE', 20, '2021-01-01', $1) RETURNING id",
                [Array.isArray(p) ? p[0].id : p],
            );
            productService = testContainer.resolve(ProductService);
            batchId = Array.isArray(b) ? b[0].id : b;
        });

        it('can allocate to a batch', async function () {
            // test the service will allocate to the batch
            const ref = await productService.allocate(
                new OrderLine('SMALL-TABLE', 20, 'order-001'),
            );
            expect(ref).to.equal('batch-001');

            const [order] = await queryRunner.query('SELECT * FROM order_line');

            expect({
                sku: order.sku,
                quantity: order.quantity,
                batchId: order.batchId,
                reference: order.reference,
            }).to.deep.equal({
                sku: 'SMALL-TABLE',
                quantity: 20,
                batchId: batchId,
                reference: 'order-001',
            });
        });

        it('can allocate to a batch with multiple order lines', async function () {
            // test the service will allocate to the batch
            let ref = await productService.allocate(
                new OrderLine('SMALL-TABLE', 5, 'order-001'),
            );
            expect(ref).to.equal('batch-001');

            ref = await productService.allocate(
                new OrderLine('SMALL-TABLE', 5, 'order-002'),
            );
            expect(ref).to.equal('batch-001');

            ref = await productService.allocate(
                new OrderLine('SMALL-TABLE', 5, 'order-003'),
            );
            expect(ref).to.equal('batch-001');

            ref = await productService.allocate(
                new OrderLine('SMALL-TABLE', 5, 'order-004'),
            );
            expect(ref).to.equal('batch-001');

            const orders = await queryRunner.query('SELECT * FROM order_line');
            expect(orders.length).to.equal(4);
            expect(orders.every((o: any) => o.batchId === batchId)).to.be.true;
        });

        it('can not allocate to a batch that is out of stock', async function () {
            try {
                await productService.allocate(
                    new OrderLine('SMALL-TABLE', 21, 'order-001'),
                );
                throw new Error('should not get here');
            } catch (e: any) {
                expect(e.message).to.equal('Out of stock for sku SMALL-TABLE');
            }
        });

        this.afterEach(async function () {
            await ctx.finish();
            await testContainer.dispose();
            await queryRunner.release();
        });
    });
});
