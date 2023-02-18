import { inject, singleton } from 'tsyringe';
import { DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';

@singleton()
export class EnvironmentSingleton {
    constructor(
        @inject('env.path') envPath: string,
        @inject('shared.path') sharedPath: string,
    ) {
        dotenv.config({ path: sharedPath });
        dotenv.config({ path: envPath, override: true });
    }
    static self(
        service?: EnvironmentSingleton,
    ): EnvironmentSingleton | { get: (key: string) => string } {
        return (
            service || {
                get: (key: string) => {
                    throw new Error(`Missing environment variable: ${key}`);
                },
            }
        );
    }

    get(key: string): string {
        const value = process.env[key];
        if (value === undefined) {
            throw new Error(`Missing environment variable: ${key}`);
        }
        return value;
    }

    getNumber(key: string): number {
        return Number(this.get(key));
    }

    get migrations(): string[] {
        return [
            EnvironmentSingleton.self(this).get('MIGRATION_DIR') + '*{.js,.ts}',
        ];
    }

    get pgEnv(): DataSourceOptions {
        const self = EnvironmentSingleton.self(this);

        return {
            type: 'postgres',
            host: self.get('DB_HOST'),
            port: Number(self.get('DB_PORT')),
            username: self.get('DB_USER'),
            password: self.get('DB_PASSWORD'),
            database: self.get('DB_DATABASE'),
            migrations: this.migrations,
            logging: self.get('DB_LOGGING') === 'true',
        };
    }

    get sqliteEnv(): DataSourceOptions {
        const self = EnvironmentSingleton.self(this);

        return {
            type: 'sqlite',
            database: self.get('DB_CONNECTION_STRING'),
            migrations: this.migrations,
            logging: self.get('DB_LOGGING') === 'true',
        };
    }

    get nodeEnv(): string {
        return EnvironmentSingleton.self(this).get('NODE_ENV');
    }
}
