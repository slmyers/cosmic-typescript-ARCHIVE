import { AbstractTypeormUnitOfWork } from '@/unitofwork/typeorm.unitofwork';
import { DataSource } from 'typeorm';
import { Lifecycle, scoped } from 'tsyringe';
import { inject } from 'tsyringe';
import { IOrderLine } from '$/model/orderline.model';
import { IProduct } from '$/model/product.model';
import { ProductRepo } from '$/types/index';
import { ProductRepository } from './product.repository';

@scoped(Lifecycle.ContainerScoped)
export class ProductUnitOfWork extends AbstractTypeormUnitOfWork {
    productRepository!: ProductRepo;

    constructor(
        @inject(DataSource)
        dataSource: DataSource,
    ) {
        super(dataSource, [], []);
        this.productRepository = new ProductRepository(this.queryRunner);
    }

    async allocate(product: IProduct, orderLine: IOrderLine): Promise<string> {
        let result = null;

        try {
            result = await this.productRepository.allocate(product, orderLine);
            // are we updating the same version we allocated?
            const versionControl = await this.queryRunner.query(
                `UPDATE product SET version = $1 WHERE sku = $2 AND version = $1`,
                [result.version, product.sku],
            );
            console.log(versionControl); // 1 if updated, 0 if not
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }
        return result.ref;
    }

    async get(sku: string): Promise<IProduct> {
        let result = null;

        try {
            result = await this.productRepository.get(sku);
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }
        return result;
    }

    async save(product: IProduct): Promise<IProduct> {
        let result = null;
        try {
            result = await this.productRepository.save(product);
        } catch (error: any) {
            this.errors.push(new Error(error.message));
            throw error;
        }

        return result;
    }
}
