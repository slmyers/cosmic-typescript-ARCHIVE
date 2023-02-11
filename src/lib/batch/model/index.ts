import { BatchDomain } from './domain.js';
import { IOrderLine } from '$orderline/model';
export { IBatch } from './interface.js';
export { BatchEntity } from './entity.js';
export { BatchDomain } from './domain.js';

export function allocate(line: IOrderLine, batches: BatchDomain[]): string {
    const batch = batches.find((b) => b.canAllocate(line));
    if (batch) {
        batch.allocate(line);
    }
    return batch?.reference || '';
}
