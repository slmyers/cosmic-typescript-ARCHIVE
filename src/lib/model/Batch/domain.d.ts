import { IOrderLine } from '../OrderLine/interface';

// type declaration for a batch of items with a sku, quantity and allocated quantity
export declare class Batch {
    reference: string;
    sku: string;
    quantity: number;
    eta: Date;
    // set of lines that have been allocated to this batch
    private _allocatedLines: Set<string>;
    constructor(reference: string, sku: string, quantity: number, eta: Date);
    allocate(line: IOrderLine): void;
    canAllocate(line: IOrderLine): boolean;
    get availableQuantity(): number;
    // compare instance against another batch to determine equality
    equals(batch: Batch): boolean;
    // compare instance against another batch to determine priority
    // higher priority batches are allocated first
    // priority is determined by the batch with the earliest eta
    // if the eta is the same, the batch with the most available quantity is allocated first
    // if the eta and available quantity are the same, the batch with the lowest reference is allocated first
    // if the eta, available quantity and reference are the same, the batches are equal
    // @param batch {Batch} the batch to compare against
    // @returns {number} -1 if this batch has higher priority, 1 if the other batch has higher priority, 0 if the batches are equal
    priority(batch: Batch): number;
    // returns the allocated quantity by summing all lines allocated to this batch
    get allocatedQuantity(): number;
    deallocate(line: IOrderLine): void;
}
