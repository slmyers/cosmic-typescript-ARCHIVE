import { interpret } from 'xstate';
import machineFactory from './machine.unitofwork.factory';
import { BaseUnitOfWork } from './base.unitofwork';

export abstract class FakeUnitOfWork extends BaseUnitOfWork {
    baseService: any;

    constructor() {
        super();
        this.baseService = interpret(machineFactory()).start();
        void this.init();
    }
}
