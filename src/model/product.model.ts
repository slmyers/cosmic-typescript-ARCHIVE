import { Batch } from './batch.model';
import { OrderLine } from './orderline.model';

export class Product implements IProduct {
    constructor(
        public sku: string,
        public batches: Batch[],
        public modified?: Date,
    ) {}

    allocate(line: OrderLine): string {
        const batch = this.batches.find((b) => b.canAllocate(line));
        if (batch) {
            batch.allocate(line);
            return batch.reference;
        }
        throw new Error(`Out of stock for sku ${line.sku}`);
    }
}

export interface IProduct {
    sku: string;
    batches: Batch[] | undefined;
    modified?: Date;
    allocate(line: OrderLine): string;
}
