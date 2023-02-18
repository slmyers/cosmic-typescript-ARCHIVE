import { OrderLine } from '$/model/index.js';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Generated,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { BatchEntity } from './batch.repository.js';

@Entity({ name: 'order_line' })
export class OrderLineEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    @Generated('uuid')
    reference!: string;

    @Column()
    sku!: string;

    @Column()
    quantity!: number;

    @CreateDateColumn()
    created!: Date;

    @UpdateDateColumn()
    modified!: Date;

    @ManyToOne(() => BatchEntity, (batch) => batch.orderLines)
    batch!: BatchEntity;

    @Column()
    @JoinColumn()
    batchId!: number;

    toModel(): OrderLine {
        return new OrderLine(this.sku, this.quantity, this.reference);
    }

    constructor(values?: Partial<OrderLineEntity>) {
        Object.assign(this, values);
    }
}
