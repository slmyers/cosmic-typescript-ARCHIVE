import { IOrderLine, IProduct, Product } from '$/model/index';
import { ProductRepo, ProductAllocation } from '$/types/index';
import { inject, injectable } from 'tsyringe';

@injectable()
export class FakeProductRepository implements ProductRepo {
    private products: IProduct[] = [];

    constructor(@inject('FakeProducts') fakeProducts: Product[]) {
        if (fakeProducts) {
            this.products = fakeProducts;
        } else {
            this.products = [];
        }
    }

    async allocate(orderLine: IOrderLine): Promise<ProductAllocation> {
        const productFound = this.products.find((p) => p.sku === orderLine.sku);
        if (!productFound) {
            throw new Error(`Product not found`);
        }

        const batch = productFound.batches?.find((b) =>
            b.canAllocate(orderLine),
        );
        if (batch) {
            batch.allocate(orderLine);
            return {
                version: productFound.version,
                ref: batch.reference,
            };
        }

        throw new Error(`Out of stock for sku ${orderLine.sku}`);
    }

    async save(product: IProduct): Promise<IProduct> {
        const foundProduct = this.products.findIndex(
            (p) => p.sku === product.sku,
        );
        if (foundProduct >= 0) {
            const p = this.products[foundProduct];
            if (p.version !== product.version) {
                throw new Error(`Version mismatch`);
            }
            const update = new Product(
                product.sku,
                p.batches
                    ? p.batches.concat(product.batches || [])
                    : product.batches || [],
                p.version,
            );
            this.products.splice(foundProduct, 1, update);
            return update;
        }
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

        return new Product(product.sku, product.batches || [], product.version);
    }
}
