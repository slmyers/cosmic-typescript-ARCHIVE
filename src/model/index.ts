import { Batch, IBatch } from './batch.model';
import { IOrderLine, OrderLine } from './orderline.model';
export { Batch, IOrderLine, IBatch, OrderLine };

export function allocate(line: IOrderLine, batches: Batch[]): string {
    const batch = batches.find((b) => b.canAllocate(line));
    if (batch) {
        batch.allocate(line);
    }
    return batch?.reference || '';
}
