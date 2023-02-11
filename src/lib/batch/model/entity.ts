/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Generated,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { BatchDomain } from './domain';
import { OrderLineEntity } from '$orderline/model';

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

    @OneToMany(() => OrderLineEntity, (orderLine) => orderLine.batchId)
    orderLines!: OrderLineEntity[];

    constructor(reference: string, sku: string, qty: number, eta: Date) {
        super(reference, sku, qty, eta);
    }
}
