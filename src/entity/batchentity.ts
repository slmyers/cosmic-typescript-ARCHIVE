/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Generated,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { BatchDomain } from '$domain/batchdomain';
import { OrderLineEntity } from './orderlineentity';
import { injectable } from 'tsyringe';

@injectable()
@Entity({ name: 'batch' })
export class BatchEntity extends BatchDomain {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    sku!: string;

    @Column()
    quantity!: number;

    @Column()
    @Generated('uuid')
    reference!: string;

    @Column()
    eta!: Date;

    @CreateDateColumn()
    readonly created!: Date;

    @UpdateDateColumn()
    readonly modified!: Date;

    @OneToMany(() => OrderLineEntity, (orderLine) => orderLine.batch)
    orderLines?: OrderLineEntity[];

    onAllocated(line: OrderLineEntity) {
        if (!this.id) {
            throw new Error('Batch must be saved before allocating');
        }

        if (!this.orderLines) {
            this.orderLines = [];
        }

        if (!this.orderLines.some((l) => l.reference === line.reference)) {
            line.batchId = this.id;
            this.orderLines.push(line);
            this.quantity = super.availableQuantity;
        }
    }

    constructor(reference: string, sku: string, qty: number, eta: Date) {
        super(reference, sku, qty, eta);

        super.on('allocated', (event: any) => {
            this.onAllocated(event.line);
        });
    }
}
