import { IOrderLine } from '$/model/index';
import { ProductUnitOfWork } from '$/repository/product.uow.js';
import { injectable, inject } from 'tsyringe';

@injectable()
export class ProductService {
    constructor(
        @inject('ProductUoW') private readonly productUoW: ProductUnitOfWork,
    ) {}

    async allocate(orderLine: IOrderLine): Promise<string> {
        const ref = await this.productUoW.allocate(orderLine);

        if (!ref) {
            throw new Error(`Unable to allocate for sku ${orderLine.sku}`);
        }

        return ref;
    }

    get unitOfWork(): ProductUnitOfWork {
        return this.productUoW;
    }
}
