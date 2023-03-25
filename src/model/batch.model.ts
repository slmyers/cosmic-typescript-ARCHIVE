import { IOrderLine } from './orderline.model';

export class Batch implements IBatch {
    private _allocatedLines: Map<string, IOrderLine>;
    constructor(
        public reference: string,
        public sku: string,
        public quantity: number,
        public eta: Date,
        public options: any = {
            orderLines: [],
            id: undefined,
        },
    ) {
        this._allocatedLines = new Map<string, IOrderLine>();
        for (const line of options.orderLines) {
            this._allocatedLines.set(line.reference, line);
        }
    }
    id?: number | undefined;
    /**
     * determines if a line can be allocated to this batch
     * will not allocate more than available
     * will not allocate a line that does not match the sku
     * will not allocate a line that has already been allocated
     * @param line {IOrderLine} the line to allocate
     */
    canAllocate(line: IOrderLine): boolean {
        return (
            this.sku === line.sku &&
            this.availableQuantity >= line.quantity &&
            !this._allocatedLines.has(line.reference)
        );
    }
    allocate(line: IOrderLine): void {
        if (this.canAllocate(line)) {
            this._allocatedLines.set(line.reference, line);
        }
    }
    deallocate(line: IOrderLine): void {
        if (this._allocatedLines.has(line.reference)) {
            this._allocatedLines.delete(line.reference);
        }
    }
    /**
     * compare instance against another batch to determine equality
     * @param batch {Batch} the batch to compare against
     * @returns {boolean} true if the batches are equal
     */
    equals(batch: Batch): boolean {
        const sameReference = this.reference === batch.reference;
        const sameSku = this.sku === batch.sku;
        let sameOrders =
            this._allocatedLines.size === batch._allocatedLines.size;
        for (const reference of this._allocatedLines.keys()) {
            if (!batch._allocatedLines.has(reference)) {
                sameOrders = false;
                break;
            }
        }
        return sameReference && sameSku && sameOrders;
    }

    /**
     * compare instance against another batch to determine priority
     * higher priority batches are allocated first
     * priority is determined by the batch with the earliest eta
     * if the eta is the same, the batch with the most available quantity is allocated first
     * if the eta and available quantity are the same then batches are equal
     * @param batch {Batch} the batch to compare against
     * @returns {number} -1 if this batch has higher priority, 1 if the other batch has higher priority, 0 if the batches are equal
     * */
    priority(batch: IBatch): number {
        if (this.eta < batch.eta) {
            return -1;
        }
        if (this.eta > batch.eta) {
            return 1;
        }
        if (this.availableQuantity < batch.availableQuantity) {
            return -1;
        }
        if (this.availableQuantity > batch.availableQuantity) {
            return 1;
        }
        return 0;
    }

    /**
     * returns the allocated quantity by summing all lines allocated to this batch
     * @returns {number} the allocated quantity
     * */
    get allocatedQuantity(): number {
        return Array.from(this._allocatedLines.values()).reduce(
            (sum, line) => sum + line.quantity,
            0,
        );
    }

    /**
     * returns the available quantity by subtracting the allocated quantity from the total quantity
     * @returns {number} the available quantity
     * */
    get availableQuantity(): number {
        return this.quantity - this.allocatedQuantity;
    }

    toModel(): Batch {
        return this;
    }
}

export interface IBatch {
    reference: string;
    sku: string;
    quantity: number;
    eta: Date;
    options: any;
    toModel(): Batch;
    canAllocate(line: IOrderLine): boolean;
    allocate(line: IOrderLine): void;
    allocatedQuantity: number;
    priority(batch: IBatch): number;
    availableQuantity: number;
}
