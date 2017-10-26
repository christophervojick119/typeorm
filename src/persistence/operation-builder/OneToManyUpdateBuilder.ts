import {Subject} from "../Subject";
import {OrmUtils} from "../../util/OrmUtils";
import {ObjectLiteral} from "../../common/ObjectLiteral";
import {EntityMetadataUtils} from "../../metadata/EntityMetadataUtils";
import {RelationMetadata} from "../../metadata/RelationMetadata";

/**
 * Builds operations needs to be executed for one-to-many relations of the given subjects.
 *
 * by example: post contains one-to-many relation with category in the property called "categories", e.g.
 *             @OneToMany(type => Category, category => category.post) categories: Category[]
 *             If user adds categories into the post and saves post we need to bind them.
 *             This operation requires updation of category table since its owner of the relation and contains a join column.
 *
 * note: this class shares lot of things with OneToOneInverseSideOperationBuilder, so when you change this class
 *       make sure to reflect changes there as well.
 */
export class OneToManyUpdateBuilder {

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(protected subjects: Subject[]) {
    }

    // ---------------------------------------------------------------------
    // Public Methods
    // ---------------------------------------------------------------------

    /**
     * Builds all required operations.
     */
    build(): void {
        this.subjects.forEach(subject => {
            subject.metadata.oneToManyRelations.forEach(relation => {

                // skip relations for which persistence is disabled
                if (relation.persistenceEnabled === false)
                    return;

                this.buildForSubjectRelation(subject, relation);
            });
        });
    }

    // ---------------------------------------------------------------------
    // Protected Methods
    // ---------------------------------------------------------------------

    /**
     * Builds operations for a given subject and relation.
     *
     * by example: subject is "post" entity we are saving here and relation is "categories" inside it here.
     */
    protected buildForSubjectRelation(subject: Subject, relation: RelationMetadata) {

        // prepare objects (relation id maps) for the database entity
        // note: subject.databaseEntity contains relations with loaded relation ids only
        // by example: since subject is a post, we are expecting to get all post's categories saved in the database here,
        //             particularly their relation ids, e.g. category ids stored in the database
        let relatedEntityDatabaseRelationIds: ObjectLiteral[] = [];
        if (subject.databaseEntity) { // related entities in the database can exist only if this entity (post) is saved
            relatedEntityDatabaseRelationIds = relation.getEntityValue(subject.databaseEntity);
        }

        // get related entities of persisted entity
        // by example: get categories from the passed to persist post entity
        let relatedEntities: ObjectLiteral[] = relation.getEntityValue(subject.entity!);
        if (relatedEntities === null) // we treat relations set to null as removed, so we don't skip it
            relatedEntities = [] as ObjectLiteral[];
        if (relatedEntities === undefined) // if relation is undefined then nothing to update
            return;

        // extract only relation ids from the related entities, since we only need them for comparision
        // by example: extract from categories only relation ids (category id, or let's say category title, depend on join column options)
        const relatedPersistedEntityRelationIds: ObjectLiteral[] = [];
        relatedEntities.forEach(relatedEntity => { // by example: relatedEntity is a category here
            const relationIdMap = relation.getRelationIdMap(relatedEntity); // by example: relationIdMap is category.id map here, e.g. { id: ... }

            // try to find a subject of this related entity, maybe it was loaded or was marked for persistence
            let relatedEntitySubject = this.subjects.find(operateSubject => {
                return !!operateSubject.entity && operateSubject.entity === relatedEntity;
            });

            // if relationIdMap is undefined then it means user binds object which is not saved in the database yet
            // by example: if post contains categories which does not have ids yet (because they are new)
            //             it means they are always newly inserted and relation update operation always must be created for them
            //             it does not make sense to perform difference operation for them for both add and remove actions
            if (!relationIdMap) {

                // if related entity does not have a subject then it means user tries to bind entity which wasn't saved
                // in this persistence because he didn't pass this entity for save or he did not set cascades
                // but without entity being inserted we cannot bind it in the relation operation, so we throw an exception here
                if (!relatedEntitySubject)
                    throw new Error(`One-to-many relation ${relation.entityMetadata.name}.${relation.propertyPath} contains ` +
                        `entities which do not exist in the database yet, thus they cannot be bind in the database. ` +
                        `Please setup cascade insertion or save entity before binding it.`);

                // okay, so related subject exist and its marked for insertion, then add a new change map
                // by example: this will tell category to insert into its post relation our post we are working with
                //             relatedEntitySubject is newly inserted CategorySubject
                //             relation.inverseRelation is ManyToOne relation inside Category
                //             subject is Post needs to be inserted into Category
                relatedEntitySubject.changeMaps.push({
                    relation: relation.inverseRelation!,
                    value: subject
                });

                return;
            }

            // check if this binding really exist in the database
            // by example: find our category if its already bind in the database
            const relationIdInDatabaseSubjectRelation = relatedEntityDatabaseRelationIds.find(relatedDatabaseEntityRelationId => {
                return OrmUtils.deepCompare(relationIdMap, relatedDatabaseEntityRelationId);
            });

            // if relationIdMap DOES NOT exist in the subject's relation in the database it means its a new relation and we need to "bind" them
            // by example: this will tell category to insert into its post relation our post we are working with
            //             relatedEntitySubject is newly inserted CategorySubject
            //             relation.inverseRelation is ManyToOne relation inside Category
            //             subject is Post needs to be inserted into Category
            if (!relationIdInDatabaseSubjectRelation) {

                // if there is no relatedEntitySubject then it means "category" wasn't persisted,
                // but since we are going to update "category" table (since its an owning side of relation with join column)
                // we create a new subject here:
                if (!relatedEntitySubject) {
                    relatedEntitySubject = new Subject(relation.inverseEntityMetadata);
                    relatedEntitySubject.canBeUpdated = true;
                    relatedEntitySubject.identifier = relationIdMap;
                    this.subjects.push(relatedEntitySubject);
                }

                relatedEntitySubject.changeMaps.push({
                    relation: relation.inverseRelation!,
                    value: subject
                });
            }

            // if related entity has relation id then we add it to the list of relation ids
            // this list will be used later to compare with database relation ids to find a difference
            // what exist in this array and does not exist in the database are newly inserted relations
            // what does not exist in this array, but exist in the database are removed relations
            // removed relations are set to null from inverse side of relation
            relatedPersistedEntityRelationIds.push(relationIdMap);
        });

        // find what related entities were added and what were removed based on difference between what we save and what database has
        EntityMetadataUtils
            .difference(relatedEntityDatabaseRelationIds, relatedPersistedEntityRelationIds)
            .forEach(removedRelatedEntityRelationId => { // by example: removedRelatedEntityRelationId is category that was bind in the database before, but now its unbind

                // todo: probably we can improve this in the future by finding entity with column those values,
                // todo: maybe it was already in persistence process. This is possible due to unique requirements of join columns
                // we create a new subject which operations will be executed in subject operation executor
                const removedRelatedEntitySubject = new Subject(relation.inverseEntityMetadata);
                removedRelatedEntitySubject.canBeUpdated = true;
                removedRelatedEntitySubject.identifier = removedRelatedEntityRelationId;
                removedRelatedEntitySubject.changeMaps.push({
                    relation: relation.inverseRelation!,
                    value: null
                });
                this.subjects.push(removedRelatedEntitySubject);
            });
    }

}