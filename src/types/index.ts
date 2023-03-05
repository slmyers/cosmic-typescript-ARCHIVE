/** @file Typescript typing information
 * If you want to break your types out from your code, you can
 * place them into the 'types' folder. Note that if you using
 * the type declaration extention ('.d.ts') your files will not
 * be compiled -- if you need to deliver your types to consumers
 * of a published npm module use the '.ts' extension instead.
 */

import { IBatch } from '$/model/batch.model.js';
import { IOrderLine } from '$/model/orderline.model.js';
import { FindManyOptions, RemoveOptions } from 'typeorm';

export interface BatchRepo {
    allocate(batch: IBatch, orderLine: IOrderLine): Promise<IOrderLine>;
    find(options?: FindManyOptions<IBatch> | undefined): Promise<IBatch[]>;
    save(batch: IBatch): Promise<void>;
    remove(
        entities: IBatch[],
        options?: RemoveOptions | undefined,
    ): Promise<IBatch[]>;
    count(options: FindManyOptions<IBatch>): Promise<number>;
}

export type workState =
    | 'init'
    | 'connected'
    | 'committed'
    | 'rolledback'
    | 'released';

export interface UoW {
    state: workState[];
    // batchRepository: BatchRepo;
    errors: Error[];
    dispose(): Promise<void>;
    // allocate(batch: IBatch, orderLine: IOrderLine): Promise<IOrderLine>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): Promise<void>;
    init?(): Promise<void>;
    get connected() : boolean;
    get initialized() : boolean;
    get committed() : boolean;
    get rolledback() : boolean;
    get released() : boolean;
}

export interface BatchUoW extends UoW {
    batchRepository: BatchRepo;
    allocate(batch: IBatch, orderLine: IOrderLine): Promise<IOrderLine>;
}
