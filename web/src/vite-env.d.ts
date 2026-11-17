/// <reference types="vite/client" />

declare module 'sql.js' {
  export interface PreparedStatement {
    run(values?: Array<string | number | Uint8Array | null>): void;
    free(): boolean;
  }

  export class Database {
    constructor(data?: ArrayLike<number> | null);
    run(sql: string, params?: Array<string | number | Uint8Array | null>): Database;
    prepare(sql: string): PreparedStatement;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export default function initSqlJs(config?: {
    locateFile?: (filename: string) => string;
  }): Promise<SqlJsStatic>;
}
