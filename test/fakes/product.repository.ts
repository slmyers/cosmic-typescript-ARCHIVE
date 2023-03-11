import { IOrderLine, IProduct, Product } from '$/model/index';
import { ProductRepo } from '$/types/index';
import { inject, injectable } from 'tsyringe';

@injectable()
export class FakeProductRepository implements ProductRepo {
    private products: Product[] = [];

    constructor(@inject('FakeProducts') fakeProducts: Product[]) {
        if (fakeProducts) {
            this.products = fakeProducts;
        } else {
            this.products = [];
        }
    }

    async allocate(product: IProduct, orderLine: IOrderLine): Promise<string> {
        if (!(product && product.sku)) {
            throw new Error(`Product not found`);
        }

        const batch = product.batches?.find((b) => b.canAllocate(orderLine));
        if (batch) {
            batch.allocate(orderLine);
            return batch.reference;
        }

        throw new Error(`Out of stock for sku ${orderLine.sku}`);
    }

    async save(product: Product): Promise<IProduct> {
        this.products.push(product);
        return product;
    }

    async get(sku: string): Promise<Product> {
        if (!sku) {
            throw new Error(`Product not found`);
        }

        const product = this.products.find((p) => p.sku === sku);
        if (!product) {
            throw new Error(`Product not found`);
        }

        return product;
    }
}
