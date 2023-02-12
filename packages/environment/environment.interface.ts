export interface IEnvironment {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    migrations: string[];
    connection_string: string;
    node_env: string;
}
