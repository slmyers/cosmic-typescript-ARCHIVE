import { Batch, IBatch } from './batch.model';
import { IOrderLine, OrderLine } from './orderline.model';
import { IProduct, Product } from './product.model';
export { Batch, IOrderLine, IBatch, OrderLine, IProduct, Product };

export function allocate(line: IOrderLine, batches: IBatch[]): string {
    const batch = batches.find((b) => b.canAllocate(line));
    if (batch) {
        batch.allocate(line);
    }
    return batch?.reference || '';
}
