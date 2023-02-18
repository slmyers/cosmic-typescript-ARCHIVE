import { v4 as uuidv4 } from 'uuid';

export class OrderLine implements IOrderLine {
    readonly reference: string;
    constructor(
        public sku: string,
        public quantity: number,
        reference?: string,
    ) {
        if (!reference) {
            this.reference = uuidv4();
        } else {
            this.reference = reference;
        }
    }
}

export interface IOrderLine {
    reference: string;
    sku: string;
    quantity: number;
    id?: number;
}
