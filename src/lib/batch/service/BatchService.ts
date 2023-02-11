import { DataSource } from 'typeorm';
import { injectable, inject } from 'tsyringe';
import { BatchEntity } from '$batch/model';

@injectable()
export class BatchService {
    constructor(@inject(DataSource) private dataSource: DataSource) {}
}
