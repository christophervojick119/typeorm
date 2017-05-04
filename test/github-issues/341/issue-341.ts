import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";
import {Category} from "./entity/Category";
import {expect} from "chai";

describe("github issues > OneToOne relation with referencedColumnName does not work", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchemaOnConnection: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("custom join column name and referencedColumnName", () => Promise.all(connections.map(async connection => {

        const category = new Category();
        category.name = "category #1";
        await connection.entityManager.persist(category);

        const post = new Post();
        post.title = "post #1";
        post.category = category;
        await connection.entityManager.persist(post);

        const loadedPost = await connection
            .entityManager
            .createQueryBuilder(Post, "post")
            .leftJoinAndSelect("post.category", "category")
            .getOne();

        expect(loadedPost).not.to.be.empty;
        expect(loadedPost!.category).not.to.be.empty;

    })));

});
