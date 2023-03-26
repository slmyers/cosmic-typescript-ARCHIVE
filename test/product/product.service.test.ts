import { expect } from 'chai';
import { DependencyContainer, container } from 'tsyringe';
import { ProductService } from '$/service/index';
import { OrderLine, Product, IBatch, Batch } from '$/model/index';
import { TestModule } from '$test/setup';
import {
    FakeProductUnitOfWork,
    FakeProductRepository,
} from '$test/fakes/index';
import { TransactionalTestContext } from '$test/TransactionalTestContext';
import { DataSource, QueryRunner } from 'typeorm';

describe('product service', function () {
    let productService: ProductService;
    let testContainer: DependencyContainer;
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
            const [{ id: productId }] = await queryRunner.query(
                "INSERT INTO product (sku, version) VALUES ('SMALL-TABLE', 1) RETURNING id",
            );

            await queryRunner.query(
                "INSERT INTO batch (reference, sku, quantity, eta, \"productId\") VALUES ('batch-001', 'SMALL-TABLE', 20, '2021-01-01', $1) RETURNING id",
                [productId],
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
                        await sleep(100);
                        await productService.unitOfWork.commit();
                        return ref;
                    })
                    .catch(async (e: any) => {
                        return e.message;
                    }),
                sleep(5).then(() =>
                    productService2
                        .allocate(new OrderLine('SMALL-TABLE', 15, 'order2'))
                        .catch(async (e: any) => {
                            return e.message;
                        }),
                ),
            ]);
            expect(refs.includes('batch-001'), JSON.stringify(refs)).to.be.true;
            expect(
                refs.includes('Unable to allocate for sku SMALL-TABLE'),
                JSON.stringify(refs),
            ).to.be.true;

            expect(productService.unitOfWork.getState().includes('committed'));
            expect(
                productService2.unitOfWork.getState().includes('rolledback'),
            );

            const orders = await queryRunner.query('SELECT * FROM order_line');
            expect(orders.length).to.equal(1);
            const [o] = orders;
            expect({
                sku: o.sku,
                quantity: o.quantity,
                reference: o.reference,
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
                        await sleep(100);
                        await productService2.unitOfWork.dispose();
                        return e.message;
                    }),
                sleep(5).then(() =>
                    productService
                        .allocate(new OrderLine('SMALL-TABLE', 5, 'order4'))
                        .then(async (ref) => {
                            await productService.unitOfWork.commit();
                            return ref;
                        }),
                ),
            ]);

            expect(refs.includes('batch-001'), JSON.stringify(refs)).to.be.true;
            expect(
                refs.includes('Unable to allocate for sku SMALL-TABLE'),
                JSON.stringify(refs),
            ).to.be.true;

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
                expect(e.message).to.equal(
                    'Unable to allocate for sku SMALL-TABLE',
                );
            }
        });

        this.afterEach(async function () {
            await ctx.finish();
            await testContainer.dispose();
            await queryRunner.release();
        });
    });

    describe('fake uow', function () {
        let products: Product[];
        let batches: IBatch[][];

        this.beforeEach(function () {
            createBatches();
            createProducts();
            registerContainer();
            productService = testContainer.resolve(ProductService);
        });

        this.afterEach(function () {
            void testContainer.dispose();
        });

        it('can allocate to a batch', async function () {
            // test the service will allocate to the batch
            const ref = await productService.allocate(
                new OrderLine('SMALL-TABLE', 20, 'order-001'),
            );
            expect(ref).to.equal('batch-001');

            const products: Product[] = testContainer.resolve('FakeProducts');
            const batches = products[0].batches;
            expect(
                batches.some((batch: IBatch) => batch.availableQuantity === 0),
            ).to.be.true;
            expect(productService.unitOfWork.getState()).to.deep.equal(
                '"connected"',
            );
            void testContainer.dispose();
            expect(productService.unitOfWork.getState()).to.deep.equal(
                '"released"',
            );
        });

        function registerContainer() {
            testContainer = container.createChildContainer();
            testContainer.register('ProductUoW', FakeProductUnitOfWork);
            testContainer.register('FakeProducts', {
                useValue: products,
            });
            testContainer.register(
                FakeProductRepository,
                FakeProductRepository,
            );
        }

        function createBatches() {
            batches = [
                [
                    new Batch('batch-001', 'SMALL-TABLE', 20, new Date()),
                    new Batch('batch-002', 'SMALL-TABLE', 20, new Date()),
                    new Batch('batch-003', 'SMALL-TABLE', 20, new Date()),
                ],
                [new Batch('batch-004', 'MEDIUM-TABLE', 20, new Date())],
            ];
        }

        function createProducts() {
            products = [
                new Product('SMALL-TABLE', batches[0], 1),
                new Product('MEDIUM-TABLE', batches[1], 1),
            ];
        }
    });
});

async function sleep(ms = 100) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
