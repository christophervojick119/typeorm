import {QueryBuilder} from "./QueryBuilder";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {Connection} from "../connection/Connection";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {PostgresDriver} from "../driver/postgres/PostgresDriver";
import {WhereExpression} from "./WhereExpression";
import {Brackets} from "./Brackets";
import {EntityMetadataUtils} from "../metadata/EntityMetadataUtils";
import {UpdateResult} from "./result/UpdateResult";
import {ReturningStatementNotSupportedError} from "../error/ReturningStatementNotSupportedError";
import {ArrayParameter} from "./ArrayParameter";
import {ReturningResultsEntityUpdator} from "./ReturningResultsEntityUpdator";
import {SqljsDriver} from "../driver/sqljs/SqljsDriver";
import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {WebsqlDriver} from "../driver/websql/WebsqlDriver";

/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
export class UpdateQueryBuilder<Entity> extends QueryBuilder<Entity> implements WhereExpression {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connectionOrQueryBuilder: Connection|QueryBuilder<any>, queryRunner?: QueryRunner) {
        super(connectionOrQueryBuilder as any, queryRunner);
        this.expressionMap.aliasNamePrefixingEnabled = false;
    }

    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------

    /**
     * Gets generated sql query without parameters being replaced.
     */
    getQuery(): string {
        let sql = this.createUpdateExpression();
        return sql.trim();
    }

    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    async execute(): Promise<UpdateResult> {
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs: boolean = false;

        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            // call before updation methods in listeners and subscribers
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata)
                await queryRunner.broadcaster.broadcastBeforeUpdateEvent(this.expressionMap.mainAlias!.metadata);

            // if update entity mode is enabled we may need extra columns for the returning statement
            const returningResultsEntityUpdator = new ReturningResultsEntityUpdator(queryRunner, this.expressionMap);
            if (this.expressionMap.updateEntity === true &&
                this.expressionMap.mainAlias!.hasMetadata &&
                this.expressionMap.whereEntities.length > 0) {
                this.expressionMap.extraReturningColumns = returningResultsEntityUpdator.getUpdationReturningColumns();
            }

            // execute update query
            const [sql, parameters] = this.getQueryAndParameters();
            const updateResult = new UpdateResult();
            updateResult.raw = await queryRunner.query(sql, parameters);

            // if we are updating entities and entity updation is enabled we must update some of entity columns (like version, update date, etc.)
            if (this.expressionMap.updateEntity === true &&
                this.expressionMap.mainAlias!.hasMetadata &&
                this.expressionMap.whereEntities.length > 0) {
                await returningResultsEntityUpdator.update(updateResult, this.expressionMap.whereEntities);
            }

            // call after updation methods in listeners and subscribers
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata)
                await queryRunner.broadcaster.broadcastAfterUpdateEvent(this.expressionMap.mainAlias!.metadata);

            // close transaction if we started it
            if (transactionStartedByUs)
                await queryRunner.commitTransaction();

            return updateResult;

        } catch (error) {

            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }
            throw error;

        } finally {
            if (queryRunner !== this.queryRunner) { // means we created our own query runner
                await queryRunner.release();
            }
            if (this.connection.driver instanceof SqljsDriver  && !queryRunner.isTransactionActive) {
                await this.connection.driver.autoSave();
            }
        }
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Values needs to be updated.
     */
    set(values: ObjectLiteral): this {
        this.expressionMap.valuesSet = values;
        return this;
    }

    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(where: string|((qb: this) => string)|Brackets|ObjectLiteral|ObjectLiteral[], parameters?: ObjectLiteral): this {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions
        const condition = this.computeWhereParameter(where);
        if (condition)
            this.expressionMap.wheres = [{ type: "simple", condition: condition }];
        if (parameters)
            this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andWhere(where: string|((qb: this) => string)|Brackets, parameters?: ObjectLiteral): this {
        this.expressionMap.wheres.push({ type: "and", condition: this.computeWhereParameter(where) });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orWhere(where: string|((qb: this) => string)|Brackets, parameters?: ObjectLiteral): this {
        this.expressionMap.wheres.push({ type: "or", condition: this.computeWhereParameter(where) });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    whereInIds(ids: any|any[]): this {
        return this.where(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    andWhereInIds(ids: any|any[]): this {
        return this.andWhere(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new OR WHERE with conditions for the given ids.
     */
    orWhereInIds(ids: any|any[]): this {
        return this.orWhere(this.createWhereIdsExpression(ids));
    }
    /**
     * Optional returning/output clause.
     * This will return given column values.
     */
    output(columns: string[]): this;

    /**
     * Optional returning/output clause.
     * Returning is a SQL string containing returning statement.
     */
    output(output: string): this;

    /**
     * Optional returning/output clause.
     */
    output(output: string|string[]): this;

    /**
     * Optional returning/output clause.
     */
    output(output: string|string[]): this {
        return this.returning(output);
    }

    /**
     * Optional returning/output clause.
     * This will return given column values.
     */
    returning(columns: string[]): this;

    /**
     * Optional returning/output clause.
     * Returning is a SQL string containing returning statement.
     */
    returning(returning: string): this;

    /**
     * Optional returning/output clause.
     */
    returning(returning: string|string[]): this;

    /**
     * Optional returning/output clause.
     */
    returning(returning: string|string[]): this {

        // not all databases support returning/output cause
        if (!this.connection.driver.isReturningSqlSupported())
            throw new ReturningStatementNotSupportedError();

        this.expressionMap.returning = returning;
        return this;
    }

    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    whereEntity(entity: Entity|Entity[]): this {
        if (!this.expressionMap.mainAlias!.hasMetadata)
            throw new Error(`.whereEntity method can only be used on queries which update real entity table.`);

        this.expressionMap.wheres = [];
        const entities: Entity[] = entity instanceof Array ? entity : [entity];
        entities.forEach(entity => {

            const entityIdMap = this.expressionMap.mainAlias!.metadata.getEntityIdMap(entity);
            if (!entityIdMap)
                throw new Error(`Provided entity does not have ids set, cannot perform operation.`);

            this.orWhereInIds(entityIdMap);
        });

        this.expressionMap.whereEntities = entities;
        return this;
    }

    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    updateEntity(enabled: boolean): this {
        this.expressionMap.updateEntity = enabled;
        return this;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates UPDATE express used to perform insert query.
     */
    protected createUpdateExpression() {
        const valuesSet = this.getValueSet();
        // console.log("valuesSet", valuesSet);
        const metadata = this.expressionMap.mainAlias!.hasMetadata ? this.expressionMap.mainAlias!.metadata : undefined;

        // prepare columns and values to be updated
        const updateColumnAndValues: string[] = [];
        const newParameters: ObjectLiteral = {};
        let parametersCount = this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof WebsqlDriver ? 0 : Object.keys(this.expressionMap.nativeParameters).length;
        if (metadata) {
            EntityMetadataUtils.createPropertyPath(metadata, valuesSet).forEach(propertyPath => {
                // todo: make this and other query builder to work with properly with tables without metadata
                const columns = metadata.findColumnsWithPropertyPath(propertyPath);
                columns.forEach(column => {
                    const paramName = "_updated_" + column.databaseName;

                    //
                    let value = column.getEntityValue(valuesSet);
                    if (column.referencedColumn && value instanceof Object) {
                        value = column.referencedColumn.getEntityValue(value);
                    }
                    value = this.connection.driver.preparePersistentValue(value, column);

                    // todo: duplication zone
                    if (value instanceof Function) { // support for SQL expressions in update query
                        updateColumnAndValues.push(this.escape(column.databaseName) + " = " + value());
                    } else {
                        if (this.connection.driver instanceof SqlServerDriver) {
                            value = this.connection.driver.parametrizeValue(column, value);

                        } else if (value instanceof Array) {
                            value = new ArrayParameter(value);
                        }

                        if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof WebsqlDriver) {
                            newParameters[paramName] = value;
                        } else {
                            this.expressionMap.nativeParameters[paramName] = value;
                        }

                        updateColumnAndValues.push(this.escape(column.databaseName) + " = " + this.connection.driver.createParameter(paramName, parametersCount));
                        parametersCount++;
                    }
                });
            });

            if (metadata.versionColumn)
                updateColumnAndValues.push(this.escape(metadata.versionColumn.databaseName) + " = " + this.escape(metadata.versionColumn.databaseName) + " + 1");
            if (metadata.updateDateColumn)
                updateColumnAndValues.push(this.escape(metadata.updateDateColumn.databaseName) + " = CURRENT_TIMESTAMP"); // todo: fix issue with CURRENT_TIMESTAMP(6) being used, can "DEFAULT" be used?!

        } else {
            Object.keys(valuesSet).map(key => {
                let value = valuesSet[key];

                // todo: duplication zone
                if (value instanceof Function) { // support for SQL expressions in update query
                    updateColumnAndValues.push(this.escape(key) + " = " + value());
                } else {

                    // we need to store array values in a special class to make sure parameter replacement will work correctly
                    if (value instanceof Array)
                        value = new ArrayParameter(value);

                    if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof WebsqlDriver) {
                        newParameters[key] = value;
                    } else {
                        this.expressionMap.nativeParameters[key] = value;
                    }

                    updateColumnAndValues.push(this.escape(key) + " = " + this.connection.driver.createParameter(key, parametersCount));
                    parametersCount++;
                }
            });
        }

        // we re-write parameters this way because we want our "UPDATE ... SET" parameters to be first in the list of "nativeParameters"
        // because some drivers like mysql depend on order of parameters
        if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof WebsqlDriver) {
            this.expressionMap.nativeParameters = Object.assign(newParameters, this.expressionMap.nativeParameters);
        }

        // get a table name and all column database names
        const whereExpression = this.createWhereExpression();
        const returningExpression = this.createReturningExpression();

        // generate and return sql update query
        if (returningExpression && this.connection.driver instanceof PostgresDriver) {
            return `UPDATE ${this.getTableName(this.getMainTableName())} SET ${updateColumnAndValues.join(", ")}${whereExpression} RETURNING ${returningExpression}`;

        } else if (returningExpression && this.connection.driver instanceof SqlServerDriver) {
            return `UPDATE ${this.getTableName(this.getMainTableName())} SET ${updateColumnAndValues.join(", ")} OUTPUT ${returningExpression}${whereExpression}`;

        } else {
            return `UPDATE ${this.getTableName(this.getMainTableName())} SET ${updateColumnAndValues.join(", ")}${whereExpression}`; // todo: how do we replace aliases in where to nothing?
        }
    }

    /**
     * Gets array of values need to be inserted into the target table.
     */
    protected getValueSet(): ObjectLiteral {
        if (this.expressionMap.valuesSet instanceof Object)
            return this.expressionMap.valuesSet;

        throw new Error(`Cannot perform update query because update values are not defined. Call "qb.set(...)" method to specify inserted values.`);
    }

}
