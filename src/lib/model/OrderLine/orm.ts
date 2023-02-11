import {
    Column,
    CreateDateColumn,
    Entity,
    Generated,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { DomainOrderLine as DomainOrderLine } from './domain.js';
import { Batch } from '../Batch/orm.js';

@Entity({ name: 'order_line' })
export class OrderLine extends DomainOrderLine {
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

    @ManyToOne(() => Batch, (batch) => batch.orderLines)
    batchId!: number;

    constructor(sku: string, qty: number) {
        super(sku, qty);
    }
}
