import { BatchRepo } from '$/types/index.js';
import { Batch, IOrderLine, allocate, IBatch } from '$model/index';
import { injectable, inject } from 'tsyringe';
import { FindManyOptions } from 'typeorm';

@injectable()
export class FakeBatchRepository implements BatchRepo {
    _list: any[];
    constructor(@inject('FakeBatches') fakeBatches: IBatch[]) {
        if (fakeBatches) {
            this._list = fakeBatches;
        } else {
            this._list = [];
        }
    }
    async save(batch: IBatch): Promise<void> {
        this._list.push(batch);
    }
    async remove(entities: IBatch[]): Promise<IBatch[]> {
        const result = [];
        const update = [];
        for (const entity of this._list) {
            if (entities.find((e) => e.id === entity.id)) {
                result.push(entity);
            } else {
                update.push(entity);
            }
        }
        this._list = update;
        return result;
    }
    async count(options: FindManyOptions<IBatch>): Promise<number> {
        return this._list.length;
    }
    async add(batch: any) {
        this._list.push(batch);
    }
    async get(reference: any) {
        return this._list.find((b) => b.reference === reference);
    }
    async list() {
        return this._list;
    }
    async clear() {
        this._list = [];
    }
    async getBatchBySku(sku: any) {
        return this._list.find((b) => b.sku === sku);
    }
    async allocate(batch: Batch, orderLine: IOrderLine) {
        const ref = allocate(orderLine, [batch]);
        if (!ref) {
            throw new Error('Could not allocate');
        }
        return orderLine;
    }

    async find(query: any) {
        if (query.where.sku && query.order.eta) {
            const result = this._list
                .filter((b) => b.sku === query.sku)
                .sort((a, b) => a.eta.getTime() - b.eta.getTime());

            return query.take ? result.slice(0, query.take) : result;
        }

        if (query.where.reference) {
            return this._list.filter(
                (b) => b.reference === query.where.reference,
            );
        }

        return [];
    }
}
