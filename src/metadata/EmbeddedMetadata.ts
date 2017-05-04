import {ColumnMetadata} from "./ColumnMetadata";
import {EmbeddedMetadataArgs} from "../metadata-args/EmbeddedMetadataArgs";
import {RelationMetadata} from "./RelationMetadata";

/**
 * Contains all information about entity's embedded property.
 */
export class EmbeddedMetadata {

    // ---------------------------------------------------------------------
    // Public Properties
    // ---------------------------------------------------------------------

    /**
     * Parent embedded in the case if this embedded inside other embedded.
     */
    parentEmbeddedMetadata: EmbeddedMetadata;

    /**
     * Property name on which this embedded is attached.
     */
    propertyName: string;

    /**
     * Columns inside this embed.
     */
    columns: ColumnMetadata[];

    /**
     * Relations inside this embed.
     */
    relations: RelationMetadata[];

    /**
     * Nested embeddable in this embeddable (which has current embedded as parent embedded).
     */
    embeddeds: EmbeddedMetadata[];

    /**
     * Embedded target type.
     */
    type?: Function;

    /**
     * Indicates if this embedded is in array mode.
     *
     * This option works only in monogodb.
     */
    isArray: boolean;

    /**
     * Prefix of the embedded, used instead of propertyName.
     * If set to empty string, then prefix is not set at all.
     */
    customPrefix: string|undefined;

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(columns: ColumnMetadata[],
                relations: RelationMetadata[],
                embeddeds: EmbeddedMetadata[],
                args: EmbeddedMetadataArgs) {
        this.type = args.type ? args.type() : undefined;
        this.propertyName = args.propertyName;
        this.isArray = args.isArray;
        this.customPrefix = args.prefix;
        this.columns = columns;
        this.relations = relations;
        this.embeddeds = embeddeds;
        this.embeddeds.forEach(embedded => {
            embedded.parentEmbeddedMetadata = this;
        });
        this.columns.forEach(column => {
            column.embeddedMetadata = this;
        });
        this.relations.forEach(relation => {
            relation.embeddedMetadata = this;
        });
    }

    // ---------------------------------------------------------------------
    // Public Methods
    // ---------------------------------------------------------------------

    /**
     * Creates a new embedded object.
     *
     * @stable
     */
    create() {
        return new (this.type as any);
    }

    /**
     * Gets the prefix of the columns.
     * By default its a property name of the class where this prefix is.
     * But if custom prefix is set then it takes its value as a prefix.
     * However if custom prefix is set to empty string prefix to column is not applied at all.
     *
     * @stable just need move to builder process
     */
    get prefix(): string {
        const prefix = this.customPrefix !== undefined ? this.customPrefix : this.propertyName;
        return this.parentEmbeddedMetadata ? this.parentEmbeddedMetadata.prefix + "_" + prefix : prefix; // todo: use naming strategy instead of "_"  !!!
    }

    /**
     * Returns array of property names of current embed and all its parent embeds.
     *
     * example: post[data][information][counters].id where "data", "information" and "counters" are embeds
     * we need to get value of "id" column from the post real entity object.
     * this method will return ["data", "information", "counters"]
     *
     * @stable just need move to builder process
     */
    get parentPropertyNames(): string[] {
        return this.parentEmbeddedMetadata ? this.parentEmbeddedMetadata.parentPropertyNames.concat(this.propertyName) : [this.propertyName];
    }

    /**
     * Returns embed metadatas from all levels of the parent tree.
     *
     * example: post[data][information][counters].id where "data", "information" and "counters" are embeds
     * this method will return [embed metadata of data, embed metadata of information, embed metadata of counters]
     *
     * @stable just need move to builder process
     */
    get embeddedMetadataTree(): EmbeddedMetadata[] {
        return this.parentEmbeddedMetadata ? this.parentEmbeddedMetadata.embeddedMetadataTree.concat(this) : [this];
    }

    /**
     * Returns all columns of this embed and all columns from its child embeds.
     *
     * @stable just need move to builder process
     */
    get columnsFromTree(): ColumnMetadata[] {
        return this.embeddeds.reduce((columns, embedded) => columns.concat(embedded.columnsFromTree), this.columns);
    }

    /**
     * Returns all relations of this embed and all relations from its child embeds.
     *
     * @stable just need move to builder process
     */
    get relationsFromTree(): RelationMetadata[] {
        return this.embeddeds.reduce((relations, embedded) => relations.concat(embedded.relationsFromTree), this.relations);
    }

}