import { Batch, IBatch, IOrderLine } from '$/model/index';
import { inject, injectable } from 'tsyringe';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    EntityManager,
    Generated,
    OneToMany,
    PrimaryGeneratedColumn,
    Repository,
    UpdateDateColumn,
} from 'typeorm';
import { OrderLineEntity } from './orderline.repository.js';

@injectable()
export class BatchRepository extends Repository<BatchEntity> {
    constructor(@inject(EntityManager) manager: EntityManager) {
        super(BatchEntity, manager, manager.queryRunner);
    }

    async allocate(batch: IBatch, orderLine: IOrderLine): Promise<IOrderLine> {
        if (!(batch && batch.id)) {
            throw new Error('Batch not found');
        }

        const orderLineEntity = new OrderLineEntity(orderLine);
        orderLineEntity.batchId = batch.id;

        return await this.manager.save(orderLineEntity);
    }
}

@Entity({ name: 'batch' })
export class BatchEntity implements IBatch {
    @BeforeInsert()
    @BeforeUpdate()
    private beforeSave() {
        this.quantity = this.allocatedQuantity;
        if (this.quantity < 0) {
            throw new Error('Invalid quantity');
        }
    }

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
