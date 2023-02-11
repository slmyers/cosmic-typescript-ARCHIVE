import { DomainBatch } from './domain.js';
import { IOrderLine } from '../OrderLine/interface.js';
export { IBatch } from './interface';
export { Batch } from './orm';

export function allocate(line: IOrderLine, batches: DomainBatch[]): string {
    const batch = batches.find((b) => b.canAllocate(line));
    if (batch) {
        batch.allocate(line);
    }
    return batch?.reference || '';
}
