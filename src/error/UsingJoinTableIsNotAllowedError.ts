import {EntityMetadata} from "../metadata/EntityMetadata";
import {RelationMetadata} from "../metadata/RelationMetadata";

/**
 */
export class UsingJoinTableIsNotAllowedError extends Error {
    name = "UsingJoinTableIsNotAllowedError";

    constructor(entityMetadata: EntityMetadata, relation: RelationMetadata) {
        super();
        this.message = `Using JoinTable on ${entityMetadata.name}#${relation.propertyName} is wrong. ` +
            `${entityMetadata.name}#${relation.propertyName} has ${relation.relationType} relation, ` +
            `however you can use JoinTable only on many-to-many relations.`;
        Object.setPrototypeOf(this, UsingJoinTableIsNotAllowedError.prototype);
        this.stack = new Error().stack;
    }

}