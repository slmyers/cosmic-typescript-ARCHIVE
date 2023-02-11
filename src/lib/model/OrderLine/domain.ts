import { v4 as uuidv4 } from 'uuid';
import { IOrderLine } from './interface.js';

export class DomainOrderLine implements IOrderLine {
    readonly sku: string;
    readonly quantity: number;
    readonly reference: string;
    constructor(sku: string, qty: number) {
        this.sku = sku;
        this.quantity = qty;
        this.reference = uuidv4();
        Object.freeze(this);
    }
}
