import { registry } from 'tsyringe';
import { BatchEntity } from '$batch/model';
import { OrderLineEntity } from '$orderline/model';
import { BatchService } from '$batch/service/BatchService.js';

export class BatchRepository {}

registry([
    {
        token: BatchEntity,
        useClass: BatchEntity,
    },
    {
        token: OrderLineEntity,
        useClass: OrderLineEntity,
    },
    {
        token: BatchService,
        useClass: BatchService,
    },
]);
export class BatchModule {}
