/** @file Typescript typing information
 * If you want to break your types out from your code, you can
 * place them into the 'types' folder. Note that if you using
 * the type declaration extention ('.d.ts') your files will not
 * be compiled -- if you need to deliver your types to consumers
 * of a published npm module use the '.ts' extension instead.
 */
import { IOrderLine, IProduct } from '$/model/index';

export type ProductAllocation = {
    ref: string;
    version: number;
};

export interface ProductRepo {
    save(product: IProduct): Promise<IProduct>;
    allocate(orderLine: IOrderLine): Promise<ProductAllocation>;
    get(sku: string): Promise<IProduct>;
}

export type concurrencyControlStrategy = 'PESSIMISTIC' | 'OPTIMISTIC';

export type ProductLock = {
    sku: string;
    version: number;
};

export interface UoW {
    dispose(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): Promise<void>;
    init?(): Promise<void>;
    getState(): string;
}

export type Config = {
    DB_TYPE: string;
    DB_USER: string;
    DB_DATABASE: string;
    DB_PASSWORD: string;
    DB_CONNECTION_STRING: string;
    DB_PORT: number;
    DB_HOST: string;
    NODE_ENV: string;
    PROJECT_ROOT: string;
    BUILD_DIR: string;
    MIGRATION_DIR: string;

    ALLOCATE_BATCH_SIZE: number;
    DB_LOGGING?: boolean;
    CONCURRENCY_CONTROL_STRATEGY?: concurrencyControlStrategy;
};
