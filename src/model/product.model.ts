import { Batch, IBatch } from './batch.model';
import { OrderLine } from './orderline.model';

export class Product implements IProduct {
    constructor(
        public sku: string,
        public batches: IBatch[],
        public version: number,
    ) {}

    allocate(line: OrderLine): string {
        const batch = this.batches.find((b) => b.canAllocate(line));
        if (batch) {
            batch.allocate(line);
            this.version += 1;
            return batch.reference;
        }
        throw new Error(`Out of stock for sku ${line.sku}`);
    }
}

export interface IProduct {
    sku: string;
    batches: IBatch[] | undefined;
    version: number;
    allocate(line: OrderLine): string;
}
