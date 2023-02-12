import { inject, singleton } from 'tsyringe';
import { DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';

@singleton()
export class EnvironmentService {
    constructor(@inject('env.path') private readonly path: string) {
        dotenv.config({ path });
    }
    static self(
        service?: EnvironmentService,
    ): EnvironmentService | { get: (key: string) => string } {
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

    get migrations(): string[] {
        return [
            EnvironmentService.self(this).get('MIGRATION_DIR') + '*{.js,.ts}',
        ];
    }

    get pgEnv(): DataSourceOptions {
        const self = EnvironmentService.self(this);

        return {
            type: 'postgres',
            host: self.get('DB_HOST'),
            port: Number(self.get('DB_PORT')),
            username: self.get('DB_USER'),
            password: self.get('DB_PASSWORD'),
            database: self.get('DB_DATABASE'),
            migrations: this.migrations,
            logging: false,
        };
    }

    get sqliteEnv(): DataSourceOptions {
        const self = EnvironmentService.self(this);

        return {
            type: 'sqlite',
            database: self.get('DB_CONNECTION_STRING'),
            migrations: this.migrations,
            logging: false,
        };
    }

    get nodeEnv(): string {
        return EnvironmentService.self(this).get('NODE_ENV');
    }
}
