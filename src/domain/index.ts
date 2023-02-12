import { BatchDomain, IBatch } from './batchdomain';
import { IOrderLine, OrderLineDomain } from './orderlinedomain';
export { BatchDomain, IOrderLine, IBatch, OrderLineDomain };

export function allocate(line: IOrderLine, batches: BatchDomain[]): string {
    const batch = batches.find((b) => b.canAllocate(line));
    if (batch) {
        batch.allocate(line);
    }
    return batch?.reference || '';
}
