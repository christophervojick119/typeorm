import {BaseConnectionOptions} from "../../connection/BaseConnectionOptions";
import {PostgresConnectionCredentialsOptions} from "./PostgresConnectionCredentialsOptions";

/**
 * Postgres-specific connection options.
 */
export interface PostgresConnectionOptions extends BaseConnectionOptions, PostgresConnectionCredentialsOptions {

    /**
     * Database type.
     */
    readonly type: "postgres";

    /**
     * Schema name. By default is "public".
     */
    readonly schema?: string;

    /**
     * @deprecated use "schema" instead
     */
    readonly schemaName?: string;

    /**
     * Replication setup.
     */
    readonly replication?: {

        /**
         * List of read-from severs (slaves).
         */
        readonly read: PostgresConnectionCredentialsOptions[];

        /**
         * Master server used by orm to perform writes.
         */
        readonly write: PostgresConnectionCredentialsOptions;

    };

}