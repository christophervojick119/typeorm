import {Connection} from "../connection/Connection";
import {QueryRunner} from "../query-runner/QueryRunner";
import {EntityManager} from "./EntityManager";
import {SqljsDriver} from "../driver/sqljs/SqljsDriver";

/**
 * A special EntityManager that includes import/export and load/save function
 * that are unique to Sql.js
 */
export class SqljsEntityManager extends EntityManager {
    private driver: SqljsDriver;

    constructor(connection: Connection, queryRunner?: QueryRunner) {
        super(connection, queryRunner);
        this.driver = connection.driver as SqljsDriver;
    }

    /**
     * Loads either the definition from a file (node) or localstorage (browser)
     * or uses the given definition to open a new database
     */
    loadDatabase(fileNameOrLocalStorageOrData: string | Uint8Array) {
        this.driver.load(fileNameOrLocalStorageOrData);
    }
    
    /**
     * Saves the current database to a file (node) or localstorage (browser)
     * if fileNameOrLocalStorage is not set options.location is used
     */
    async saveDatabase(fileNameOrLocalStorage?: string): Promise<void> {
        await this.driver.save(fileNameOrLocalStorage);
    }

    /**
     * Returns the current database definition
     */
    exportDatabase(): Uint8Array {
        return this.driver.export();
    }
 }