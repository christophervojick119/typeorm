import {NamingStrategyInterface} from "../naming-strategy/NamingStrategyInterface";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {ForeignKeyMetadata} from "../metadata/ForeignKeyMetadata";
import {RelationMetadata} from "../metadata/RelationMetadata";
import {MetadataArgsStorage} from "../metadata-args/MetadataArgsStorage";
import {LazyRelationsWrapper} from "../lazy-loading/LazyRelationsWrapper";
import {Driver} from "../driver/Driver";
import {JoinColumnMetadataArgs} from "../metadata-args/JoinColumnMetadataArgs";

// cases it should cover:
// 1. when join column is set with custom name and without referenced column name
// we need automatically set referenced column name - primary ids by default
// @JoinColumn({ name: "custom_name" })
// 2. when join column is set with only referenced column name
// we need automatically set join column name - relation name + referenced column name
// @JoinColumn({ referencedColumnName: "title" })
// 3. when join column is set without both referenced column name and join column name
// we need to automatically set both of them
// @JoinColumn()
// 4. when join column is not set at all (as in case of @ManyToOne relation)
// we need to create join column for it with proper referenced column name and join column name
// 5. when multiple join columns set none of referencedColumnName and name can be optional
// both options are required
// @JoinColumn([
//  { name: "category_title", referencedColumnName: "type" },
//  { name: "category_title", referencedColumnName: "name" },
// ])

// since for many-to-one relations having JoinColumn decorator is not required,
// we need to go thought each many-to-one relation without join column decorator set
// and create join column metadata args for them
export class RelationJoinColumnBuilder {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private namingStrategy: NamingStrategyInterface) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    build(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata): ForeignKeyMetadata|undefined {
        const referencedColumns = this.collectRelationReferencedColumns(joinColumns, relation);
        if (!referencedColumns.length)
            return undefined; // this case is possible only for one-to-one non owning side

        const columns = this.collectRelationColumns(joinColumns, relation, referencedColumns);
        return new ForeignKeyMetadata({
            entityMetadata: relation.entityMetadata,
            referencedEntityMetadata: relation.inverseEntityMetadata,
            namingStrategy: this.namingStrategy,
            columns: columns,
            referencedColumns: referencedColumns,
            onDelete: relation.onDelete,
        });
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    protected collectRelationReferencedColumns(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata): ColumnMetadata[] {
        const hasAnyReferencedColumnName = joinColumns.find(joinColumnArgs => !!joinColumnArgs.referencedColumnName);
        const manyToOneWithoutJoinColumn = joinColumns.length === 0 && relation.isManyToOne;
        const hasJoinColumnWithoutAnyReferencedColumnName = joinColumns.length > 0 && !hasAnyReferencedColumnName;

        if (manyToOneWithoutJoinColumn || hasJoinColumnWithoutAnyReferencedColumnName) { // covers case3 and case1
            return relation.inverseEntityMetadata.primaryColumns;

        } else { // cases with referenced columns defined
            return joinColumns.map(joinColumn => {
                const referencedColumn = relation.inverseEntityMetadata.ownColumns.find(column => column.propertyName === joinColumn.referencedColumnName); // todo: can we also search in relations?
                if (!referencedColumn)
                    throw new Error(`Referenced column ${joinColumn.referencedColumnName} was not found in entity ${relation.inverseEntityMetadata.name}`);

                return referencedColumn;
            });
        }
    }

    private collectRelationColumns(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata, referencedColumns: ColumnMetadata[]): ColumnMetadata[] {
        return referencedColumns.map(referencedColumn => {

            // in the case if relation has join column with only name set we need this check
            const joinColumnMetadataArg = joinColumns.find(joinColumn => {
                return (!joinColumn.referencedColumnName || joinColumn.referencedColumnName === referencedColumn.propertyName) &&
                    !!joinColumn.name;
            });
            const joinColumnName = joinColumnMetadataArg ? joinColumnMetadataArg.name : this.namingStrategy.joinColumnName(relation.propertyName, referencedColumn.propertyName);

            let relationalColumn = relation.entityMetadata.ownColumns.find(column => column.databaseName === joinColumnName);
            if (!relationalColumn) {
                relationalColumn = new ColumnMetadata({
                    entityMetadata: relation.entityMetadata,
                    args: {
                        target: "",
                        mode: "virtual",
                        propertyName: joinColumnName!,
                        options: {
                            name: joinColumnName,
                            type: referencedColumn.type,
                            primary: relation.isPrimary,
                            nullable: relation.isNullable,
                        }
                    }
                });
                relationalColumn.build(this.namingStrategy);
                relation.entityMetadata.registerColumn(relationalColumn);
            }
            relationalColumn.referencedColumn = referencedColumn; // its important to set it here because we need to set referenced column for user defined join column
            relationalColumn.type = referencedColumn.type; // also since types of relational column and join column must be equal we override user defined column type
            relationalColumn.relationMetadata = relation;
            return relationalColumn;
        });
    }
}