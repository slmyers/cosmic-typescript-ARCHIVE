import { Batch, IBatch, IOrderLine, OrderLine } from '$/model/index';
import { BatchRepo } from '$/types/index.js';
import {
    Column,
    CreateDateColumn,
    Entity,
    Generated,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    QueryRunner,
    Repository,
    UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from './product.repository.js';

export class BatchRepository
    extends Repository<BatchEntity>
    implements BatchRepo
{
    constructor(queryRunnner: QueryRunner) {
        super(BatchEntity, queryRunnner.manager, queryRunnner);
    }

    async allocate(batch: IBatch, orderLine: IOrderLine): Promise<IOrderLine> {
        const batchEntity = await this.findOne({
            where: { reference: batch.reference },
        });

        if (!batchEntity) {
            throw new Error(`Batch ${batch.reference} not found`);
        }

        const orderLineEntity = new OrderLineEntity(orderLine);
        orderLineEntity.batchId = batchEntity.id;
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

    @ManyToOne(() => ProductEntity, (product) => product.batches)
    product!: ProductEntity;

    @Column()
    @JoinColumn()
    productId!: number;

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

    canAllocate(line: IOrderLine): boolean {
        return (
            this.sku === line.sku &&
            this.quantity - this.allocatedQuantity >= line.quantity
        );
    }

    allocate(line: IOrderLine): void {
        if (!this.canAllocate(line)) {
            throw new Error(
                `Cannot allocate line ${line.sku} to batch ${this.reference}`,
            );
        }
        if (!this.orderLines) {
            this.orderLines = [];
        }
        if (!this.orderLines.some((ol) => ol.reference === line.reference)) {
            this.orderLines.push(new OrderLineEntity(line));
        }
    }

    constructor(values?: Partial<BatchEntity>) {
        Object.assign(this, values);
    }
}

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
