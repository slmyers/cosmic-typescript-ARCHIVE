import { Batch, IBatch, IOrderLine } from '$/model/index';
import { BatchRepo } from '$/types/index.js';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    Generated,
    OneToMany,
    PrimaryGeneratedColumn,
    QueryRunner,
    Repository,
    UpdateDateColumn,
} from 'typeorm';
import { OrderLineEntity } from './orderline.repository.js';

export class BatchRepository
    extends Repository<BatchEntity>
    implements BatchRepo
{
    constructor(queryRunnner: QueryRunner) {
        super(BatchEntity, queryRunnner.manager, queryRunnner);
    }

    async allocate(batch: IBatch, orderLine: IOrderLine): Promise<IOrderLine> {
        if (!(batch && batch.id)) {
            throw new Error('Batch not found');
        }

        const orderLineEntity = new OrderLineEntity(orderLine);
        orderLineEntity.batchId = batch.id;

        return this.manager.save(orderLineEntity);
    }
}

@Entity({ name: 'batch' })
export class BatchEntity implements IBatch {
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
    created!: Date;

    @UpdateDateColumn()
    modified!: Date;

    @OneToMany(() => OrderLineEntity, (orderLine) => orderLine.batch)
    orderLines!: OrderLineEntity[];

    get allocatedQuantity(): number {
        return (this.orderLines || []).reduce(
            (total, orderLine) => total + orderLine.quantity,
            0,
        );
    }

    toModel(): Batch {
        return new Batch(
            this.reference,
            this.sku,
            this.quantity,
            this.eta,
            Array.isArray(this.orderLines)
                ? this.orderLines.map((ol) => ol.toModel())
                : [],
        );
    }

    constructor(values?: Partial<BatchEntity>) {
        Object.assign(this, values);
    }
}
