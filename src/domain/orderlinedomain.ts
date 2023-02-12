import { v4 as uuidv4 } from 'uuid';

export class OrderLineDomain implements IOrderLine {
    readonly reference: string;
    constructor(
        public sku: string,
        public quantity: number,
        reference?: string,
    ) {
        this.reference = uuidv4();
    }
}

export interface IOrderLine {
    reference: string;
    sku: string;
    quantity: number;
}
