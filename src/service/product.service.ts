import { IOrderLine } from '$/model/index';
import { ProductUnitOfWork } from '$/repository/product.uow.js';
import { injectable, inject } from 'tsyringe';

@injectable()
export class ProductService {
    constructor(
        @inject('ProductUoW') private readonly productUoW: ProductUnitOfWork,
    ) {}

    async allocate(orderLine: IOrderLine): Promise<string> {
        const product = await this.productUoW.get(orderLine.sku);
        if (!product) {
            throw new Error(`Product ${orderLine.sku} not found`);
        }
        return await this.productUoW.allocate(product, orderLine);
    }
}
