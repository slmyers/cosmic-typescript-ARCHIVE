import { AbstractTypeormUnitOfWork } from '@/unitofwork/typeorm.unitofwork';
import { DataSource } from 'typeorm';
import { Lifecycle, scoped } from 'tsyringe';
import { inject } from 'tsyringe';
import { IOrderLine } from '$/model/orderline.model';
import { IProduct } from '$/model/product.model';
import {
    concurrencyControlStrategy,
    ProductLock,
    ProductRepo,
} from '$/types/index';
import { ProductRepository } from './product.repository';
import { EnvironmentSingleton } from '@/environment/environment.singleton.js';
import { createMachine, interpret } from 'xstate';
import { waitFor } from 'xstate/lib/waitFor';

@scoped(Lifecycle.ContainerScoped)
export class ProductUnitOfWork extends AbstractTypeormUnitOfWork {
    productRepository!: ProductRepo;
    public lock: ProductLock | null = null;
    private concurrencyControlStrategy!: concurrencyControlStrategy;

    constructor(
        @inject(DataSource)
        dataSource: DataSource,
        @inject(EnvironmentSingleton)
        environment: EnvironmentSingleton,
    ) {
        super(dataSource);
        this.productRepository = new ProductRepository(this.queryRunner);
        this.concurrencyControlStrategy = environment.get(
            'CONCURRENCY_CONTROL_STRATEGY',
        ) as concurrencyControlStrategy;
    }

    async allocate(orderLine: IOrderLine): Promise<string> {
        let result = '';
        const m = createMachine(
            {
                id: 'unitofwork-allocate-' + super.id,
                initial: 'init',
                version: '0.1',
                predictableActionArguments: true,
                states: {
                    init: {
                        on: {
                            INIT: [
                                {
                                    target: 'seekingLock',
                                    cond: (context: any) =>
                                        context.pessimisticStrategy,
                                },
                                'allocating',
                            ],
                        },
                    },
                    seekingLock: {
                        entry: 'seekingLock',
                        invoke: {
                            id: 'lock',
                            src: async (context: any, _event: any) => {
                                return await context.getLock(context.sku);
                            },
                            onDone: 'allocating',
                            onError: 'lockFailed',
                        },
                    },
                    allocating: {
                        entry: 'allocating',
                        invoke: {
                            id: 'allocate',
                            src: async (context: any, _event: any) => {
                                return await context.allocate(
                                    context.orderLine,
                                );
                            },
                            onDone: 'allocated',
                            onError: 'allocationFailed',
                        },
                    },
                    allocated: {
                        entry: 'allocated',
                        type: 'final',
                    },
                    lockFailed: {
                        entry: 'lockFailed',
                        type: 'final',
                    },
                    allocationFailed: {
                        entry: 'allocationFailed',
                        type: 'final',
                    },
                },
            },
            {
                actions: {
                    allocated: (context, event: any) => {
                        result = event.data.ref;
                    },
                },
            },
        );

        const machine = m.withContext({
            sku: orderLine.sku,
            orderLine: orderLine,
            getLock: this._lock.bind(this),
            allocate: this.productRepository.allocate.bind(
                this.productRepository,
            ),
            pessimisticStrategy: this.pessimisticStrategy,
        });

        const actor = interpret(machine).start(machine.initialState);
        actor.send('INIT');

        await waitFor(actor, (state) =>
            ['allocated', 'lockFailed', 'allocationFailed'].some(state.matches),
        );

        return result;
    }

    // async allocate(orderLine: IOrderLine): Promise<string> {
    //     let result = null;

    //     if (this.pessimisticStrategy) {
    //         if (!(await this._lock(orderLine.sku))) {
    //             this.lock = null;
    //             throw new Error(`Order sku ${orderLine.sku} not found`);
    //         }
    //     }

    //     const product = await this.get(orderLine.sku);
    //     if (!product) {
    //         throw new Error(`Product ${orderLine.sku} not found`);
    //     }
    //     const currentVersion = product.version;

    //     result = await this.productRepository.allocate(product, orderLine);

    //     if (result.ref) {
    //         const [, affectedCount] = await this.queryRunner.query(
    //             'UPDATE product SET version = $1 WHERE sku = $2 AND version = $3 RETURNING id;',
    //             [product.version, product.sku, currentVersion],
    //         );
    //         if (affectedCount !== 1) {
    //             throw new Error(`Product ${orderLine.sku} version mismatch`);
    //         }
    //     }
    //     return result.ref;
    // }

    async get(sku: string): Promise<IProduct> {
        return await this.productRepository.get(sku);
    }

    async save(product: IProduct): Promise<IProduct> {
        return await this.productRepository.save(product);
    }

    private async _lock(sku: string): Promise<ProductLock> {
        const [lock] = await this.queryRunner.query(
            'SELECT id, version FROM product WHERE sku = $1 FOR UPDATE',
            [sku],
        );
        return lock;
    }

    get pessimisticStrategy(): boolean {
        return this.concurrencyControlStrategy === 'PESSIMISTIC';
    }

    async commit(): Promise<void> {
        await super.commit();
        if (this.pessimisticStrategy) {
            this.lock = null;
        }
    }

    async rollback(): Promise<void> {
        await super.rollback();
        if (this.pessimisticStrategy) {
            this.lock = null;
        }
    }

    async release(): Promise<void> {
        await super.release();
        if (this.pessimisticStrategy) {
            this.lock = null;
        }
    }

    getState(): string {
        return JSON.stringify(
            [
                this.pessimisticStrategy ? JSON.stringify(this.lock) : '',
                ...super.getState(),
            ].filter(Boolean),
        );
    }
}
