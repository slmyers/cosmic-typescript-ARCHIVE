import { v4 as uuidv4 } from 'uuid';
import { IOrderLine } from './interface.js';

export class DomainOrderLine implements IOrderLine {
    readonly reference: string;
    constructor(public sku: string, public quantity: number) {
        this.reference = uuidv4();
        Object.freeze(this);
    }
}
