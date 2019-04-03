import "reflect-metadata";
import {Connection} from "../../../src";
import {closeTestingConnections, createTestingConnections} from "../../utils/test-utils";

describe.only("view entity", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["mssql"]
    }));
    // beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should create entity view", () => Promise.all(connections.map(async connection => {
        await connection.synchronize();
        // const category = new Category();
        // category.name = "Cars";
        // await connection.manager.save(category);
        //
        // const post = new Post();
        // post.name = "BMW";
        // post.categoryId = category.id;
        // await connection.manager.save(post);
        //
        // const postCategory = await connection.manager.find(PostCategory);
        // console.log(postCategory);
    })));
});
