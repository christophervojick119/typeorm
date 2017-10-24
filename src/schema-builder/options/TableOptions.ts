import {TableColumnOptions} from "./TableColumnOptions";
import {TableIndexOptions} from "./TableIndexOptions";
import {TableForeignKeyOptions} from "./TableForeignKeyOptions";
import {TablePrimaryKeyOptions} from "./TablePrimaryKeyOptions";
import {TableUniqueOptions} from "./TableUniqueOptions";
import {TableCheckOptions} from "./TableCheckOptions";

/**
 * Table options.
 */
export interface TableOptions {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Table name.
     */
    name: string;

    /**
     * Table columns.
     */
    columns?: TableColumnOptions[];

    /**
     * Table indices.
     */
    indices?: TableIndexOptions[];

    /**
     * Table foreign keys.
     */
    foreignKeys?: TableForeignKeyOptions[];

    /**
     * Table primary key.
     */
    primaryKey?: TablePrimaryKeyOptions;

    /**
     * Table unique constraints.
     */
    uniques?: TableUniqueOptions[];

    /**
     * Table check constraints.
     */
    checks?: TableCheckOptions[];

    /**
     * Indicates if table was just created.
     * This is needed, for example to check if we need to skip primary keys creation
     * for new tables.
     */
    justCreated?: boolean;

    /**
     * Table engine.
     */
    engine?: string;

    /**
     * Database name.
     */
    database?: string;

    /**
     * Schema name. Used in Postgres and Sql Server.
     */
    schema?: string;

}