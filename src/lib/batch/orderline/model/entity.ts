/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Column,
    CreateDateColumn,
    Entity,
    Generated,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { OrderLineDomain } from './domain';
import { BatchEntity } from '$batch/model';
import { injectable } from 'tsyringe';

@injectable()
@Entity({ name: 'order_line' })
export class OrderLineEntity extends OrderLineDomain {
    @PrimaryGeneratedColumn()
    readonly id!: number;

    @Column()
    @Generated('uuid')
    readonly reference!: string;

    @Column()
    readonly sku!: string;

    @Column()
    readonly quantity!: number;

    @CreateDateColumn()
    readonly created!: Date;

    @UpdateDateColumn()
    readonly modified!: Date;

    @ManyToOne(() => BatchEntity, (batch) => batch.orderLines)
    batchId!: number;

    constructor(sku: string, qty: number) {
        super(sku, qty);
    }
}
