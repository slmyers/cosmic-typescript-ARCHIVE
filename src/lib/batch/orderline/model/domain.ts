import { v4 as uuidv4 } from 'uuid';
import { IOrderLine } from './interface.js';

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
