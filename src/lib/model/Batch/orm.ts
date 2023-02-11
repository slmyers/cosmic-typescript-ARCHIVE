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
import { DomainBatch } from './domain';
import { OrderLine } from '../OrderLine';

@Entity({ name: 'batch' })
export class Batch extends DomainBatch {
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

    @OneToMany(() => OrderLine, (orderLine) => orderLine.batchId)
    orderLines!: OrderLine[];

    constructor(reference: string, sku: string, qty: number, eta: Date) {
        super(reference, sku, qty, eta);
    }
}
