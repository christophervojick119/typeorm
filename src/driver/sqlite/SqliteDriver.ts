import {Driver} from "../Driver";
import {ObjectLiteral} from "../../common/ObjectLiteral";
import {DriverPackageNotInstalledError} from "../error/DriverPackageNotInstalledError";
import {ColumnMetadata} from "../../metadata/ColumnMetadata";
import {SqliteQueryRunner} from "./SqliteQueryRunner";
import {DriverOptionNotSetError} from "../error/DriverOptionNotSetError";
import {DataUtils} from "../../util/DataUtils";
import {PlatformTools} from "../../platform/PlatformTools";
import {Connection} from "../../connection/Connection";
import {RdbmsSchemaBuilder} from "../../schema-builder/RdbmsSchemaBuilder";
import {SqliteConnectionOptions} from "./SqliteConnectionOptions";
import {MappedColumnTypes} from "../types/MappedColumnTypes";
import {ColumnType} from "../types/ColumnTypes";

/**
 * Organizes communication with sqlite DBMS.
 */
export class SqliteDriver implements Driver {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by driver.
     */
    connection: Connection;

    /**
     * Connection options.
     */
    options: SqliteConnectionOptions;

    /**
     * SQLite underlying library.
     */
    sqlite: any;

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Gets list of supported column data types by a driver.
     *
     * @see https://www.tutorialspoint.com/sqlite/sqlite_data_types.htm
     * @see https://sqlite.org/datatype3.html
     */
    supportedDataTypes: ColumnType[] = [
        "int",
        "integer",
        "tinyint",
        "smallint",
        "mediumint",
        "bigint",
        "int2",
        "int8",
        "integer",
        "character",
        "varchar",
        "varying character",
        "nchar",
        "native character",
        "nvarchar",
        "text",
        "clob",
        "text",
        "blob",
        "real",
        "double",
        "double precision",
        "float",
        "real",
        "numeric",
        "decimal",
        "boolean",
        "date",
        "datetime",
    ];

    /**
     * Orm has special columns and we need to know what database column types should be for those types.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes = {
        createDate: "datetime",
        updateDate: "datetime",
        version: "integer",
        treeLevel: "integer",
        migrationName: "varchar",
        migrationTimestamp: "timestamp",
    };

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection) {
        this.connection = connection;
        this.options = connection.options as SqliteConnectionOptions;

        // validate options to make sure everything is set
        if (!this.options.database)
            throw new DriverOptionNotSetError("storage");

        // load sqlite package
        this.loadDependencies();
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Performs connection to the database.
     */
    connect(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Closes connection with database.
     */
    disconnect(): Promise<void> {
        return Promise.resolve();
        // todo: what to do with this function?
        // return new Promise<void>((ok, fail) => {
            // const handler = (err: any) => err ? fail(err) : ok();
            // if (!this.databaseConnection)
            //     return fail(new ConnectionIsNotSetError("sqlite"));
            // this.databaseConnection.connection.close(handler);
        // });
    }

    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder() {
        return new RdbmsSchemaBuilder(this.connection);
    }

    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner() {
        return new SqliteQueryRunner(this);
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any {
        if (value === null || value === undefined)
            return value;

        if (columnMetadata.type === Boolean) {
            return value === true ? 1 : 0;

        } else if (columnMetadata.type === "date") {
            return DataUtils.mixedDateToDateString(value);

        } else if (columnMetadata.type === "time") {
            return DataUtils.mixedDateToTimeString(value);

        } else if (columnMetadata.type === "datetime") {
            return DataUtils.mixedDateToUtcDatetimeString(value);

        } else if (columnMetadata.type === "json") {
            return JSON.stringify(value);

        } else if (columnMetadata.type === "simple-array") {
            return DataUtils.simpleArrayToString(value);
        }

        return value;
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any {
        if (columnMetadata.type === Boolean) {
            return value ? true : false;

        } else if (columnMetadata.type === "datetime") {
            return DataUtils.normalizeHydratedDate(value);

        } else if (columnMetadata.type === "date") {
            return DataUtils.mixedDateToDateString(value);

        } else if (columnMetadata.type === "time") {
            return DataUtils.mixedTimeToString(value);

        } else if (columnMetadata.type === "json") {
            return JSON.parse(value);

        } else if (columnMetadata.type === "simple-array") {
            return DataUtils.stringToSimpleArray(value);
        }

        return value;
    }

    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral): [string, any[]] {
        if (!parameters || !Object.keys(parameters).length)
            return [sql, []];

        const builtParameters: any[] = [];
        const keys = Object.keys(parameters).map(parameter => "(:" + parameter + "\\b)").join("|");
        sql = sql.replace(new RegExp(keys, "g"), (key: string): string => {
            const value = parameters[key.substr(1)];
            if (value instanceof Array) {
                return value.map((v: any) => {
                    builtParameters.push(v);
                    return "$" + builtParameters.length;
                }).join(", ");
            } else {
                builtParameters.push(value);
            }
            return "$" + builtParameters.length;
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, builtParameters];
    }

    /**
     * Escapes a column name.
     */
    escapeColumn(columnName: string): string {
        return "\"" + columnName + "\"";
    }

    /**
     * Escapes an alias.
     */
    escapeAlias(aliasName: string): string {
        return "\"" + aliasName + "\"";
    }

    /**
     * Escapes a table name.
     */
    escapeTable(tableName: string): string {
        return "\"" + tableName + "\"";
    }

    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column: ColumnMetadata): string {
        let type = "";
        if (column.type === Number || column.type === "int") {
            type += "integer";

        } else if (column.type === String) {
            type += "varchar";

        } else if (column.type === Date) {
            type += "datetime";

        } else if (column.type === Boolean) {
            type += "boolean";

        } else if (column.type === Object) {
            type += "text";

        } else if (column.type === "simple-array") {
            type += "text";

        } else {
            type += column.type;
        }
        if (column.length) {
            type += "(" + column.length + ")";

        } else if (column.precision && column.scale) {
            type += "(" + column.precision + "," + column.scale + ")";

        } else if (column.precision) {
            type += "(" + column.precision + ")";

        } else if (column.scale) {
            type += "(" + column.scale + ")";
        }

        // set default required length if those were not specified
        if (type === "varchar")
            type += "(255)";

        if (type === "int")
            type += "(11)";

        return type;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void {
        try {
            this.sqlite = PlatformTools.load("sqlite3").verbose();

        } catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError("SQLite", "sqlite3");
        }
    }

}