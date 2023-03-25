import { UoW, workState } from '$/types/index';

export abstract class FakeUnitOfWork implements UoW {
    state: workState[] = [];
    errors: Error[] = [];

    // these methods should be inheritied from the abstract class
    async init(): Promise<void> {
        if (this.released || this.committed || this.rolledback) {
            throw new Error('UnitOfWork is already disposed');
        }

        this.state.unshift('init');

        this.state.unshift('connected');
    }
    get connected() {
        return this.state.includes('connected');
    }

    get initialized() {
        return this.state.includes('init');
    }

    get committed() {
        return this.state.includes('committed');
    }

    get rolledback() {
        return this.state.includes('rolledback');
    }

    get released() {
        return this.state.includes('released');
    }

    async dispose() {
        if (!this.connected) {
            return;
        }

        if (this.committed || this.rolledback) {
            return this.release();
        }

        if (this.errors.length > 0) {
            await this.rollback();
        } else {
            await this.commit();
        }

        if (!this.released) {
            await this.release();
        }
    }
    async commit(): Promise<void> {
        this.state.unshift('committed');
    }
    async rollback(): Promise<void> {
        this.state.unshift('rolledback');
    }
    async release(): Promise<void> {
        this.state.unshift('released');
    }

    getState(): string[] {
        return this.state;
    }
}
