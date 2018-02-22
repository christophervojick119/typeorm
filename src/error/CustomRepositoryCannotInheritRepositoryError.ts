/**
 * Thrown if custom repository inherits Repository class however entity is not set in @EntityRepository decorator.
 */
export class CustomRepositoryCannotInheritRepositoryError extends Error {
    name = "CustomRepositoryCannotInheritRepositoryError";

    constructor(repository: any) {
        super(`Custom entity repository ${repository instanceof Function ? repository.name : repository.constructor.name} ` +
            ` cannot inherit Repository class without entity being set in the @EntityRepository decorator.`);
        Object.setPrototypeOf(this, CustomRepositoryCannotInheritRepositoryError.prototype);
        this.stack = new Error().stack;
    }

}