import { randomUUID } from 'crypto';
import { createMachine } from 'xstate';

export default (id = randomUUID(), options = {}) =>
    createMachine(
        {
            id: 'unitofwork-' + id,
            initial: 'init',
            version: '0.1',
            predictableActionArguments: true,
            states: {
                init: {
                    entry: 'init',
                    on: { CONNECT: 'connected', DISPOSE: 'released' },
                },
                connected: {
                    entry: 'connect',
                    on: {
                        COMMIT: 'committed',
                        ROLLBACK: 'rolledback',
                        DISPOSE: 'released',
                    },
                },
                committed: {
                    entry: 'commit',
                    on: { DISPOSE: 'released.committed' },
                },
                rolledback: {
                    entry: 'rollback',
                    on: { DISPOSE: 'released.rolledback' },
                },
                released: {
                    entry: 'release',
                    type: 'final',
                    states: { committed: {}, rolledback: {} },
                },
            },
        },
        options,
    );
