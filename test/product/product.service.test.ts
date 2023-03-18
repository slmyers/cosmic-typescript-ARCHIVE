import { expect } from 'chai';
import { DependencyContainer, container } from 'tsyringe';
import { ProductService } from '$/service/index';
import { OrderLine } from '$/model/index';
import { TestModule } from '$test/setup';
import { UoW } from '$/types/index';
import { TransactionalTestContext } from '$test/TransactionalTestContext';
import { DataSource, QueryRunner } from 'typeorm';

describe('product service', function () {
    describe('db uow', function () {
        let productService: ProductService;
        let testContainer: DependencyContainer;
        let uow: UoW;
        let ctx: TransactionalTestContext;
        let queryRunner: QueryRunner;

        this.beforeAll(async function () {
            await TestModule.bootstrap();
        });

        this.beforeEach(async function () {
            testContainer = container.createChildContainer();
            ctx = container.resolve(TransactionalTestContext);
            await ctx.start();
            const dataSource: DataSource = container.resolve(DataSource);
            queryRunner = dataSource.createQueryRunner();
            const p = await queryRunner.query(
                "INSERT INTO product (sku, version) VALUES ('SMALL-TABLE', 0) RETURNING id",
            );

            await queryRunner.query(
                "INSERT INTO batch (reference, sku, quantity, eta, \"productId\") VALUES ('batch-001', 'SMALL-TABLE', 20, '2021-01-01', $1) RETURNING id",
                [Array.isArray(p) ? p[0].id : p],
            );
            productService = testContainer.resolve(ProductService);
            uow = testContainer.resolve<UoW>('ProductUoW');
            if (uow.init) {
                await uow.init();
            }
        });

        it('can allocate to a batch', async function () {
            // test the service will allocate to the batch
            const ref = await productService.allocate(
                new OrderLine('SMALL-TABLE', 20),
            );
            expect(ref).to.equal('batch-001');

            try {
                await productService.allocate(new OrderLine('SMALL-TABLE', 20));
                throw new Error('should have thrown an error');
            } catch (e: any) {
                expect(e.message).to.equal('Out of stock for sku SMALL-TABLE');
            }
        });

        this.afterEach(async function () {
            await uow.rollback();
            await testContainer.dispose();
            // await ctx.finish();
        });
    });
});
