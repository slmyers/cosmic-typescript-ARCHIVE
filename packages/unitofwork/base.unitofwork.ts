import { UoW } from '$/types/index.js';
import { randomUUID } from 'crypto';

export abstract class BaseUnitOfWork implements UoW {
    id: string;
    baseService: any;
    history: string[] | undefined;
    current: string | undefined;

    constructor() {
        this.current = undefined;
        this.history = [];
        this.id = randomUUID();
    }

    async commit(): Promise<void> {
        this.baseService.send({
            type: 'COMMIT',
        });
    }
    async rollback(): Promise<void> {
        this.baseService.send({
            type: 'ROLLBACK',
        });
    }
    async release(): Promise<void> {
        this.baseService.send({
            type: 'DISPOSE',
        });
    }
    async init(): Promise<void> {
        this.baseService.onTransition((state: any) => {
            if (this.current && Array.isArray(this.history)) {
                this.history.unshift(this.current);
            }
            this.current = state.value;
        });

        this.baseService.send({
            type: 'CONNECT',
        });
    }
    async dispose() {
        if (this.current === 'released') {
            return;
        }

        this.baseService.send({
            type: 'COMMIT',
        });
        this.baseService.send({
            type: 'DISPOSE',
        });
        this.baseService.stop();
    }
    getState(): string {
        return JSON.stringify(this.current);
    }
}
