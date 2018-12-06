import "reflect-metadata";
import { closeTestingConnections, createTestingConnections, reloadTestingDatabases } from "../../../utils/test-utils";
import { Connection } from "../../../../src/connection/Connection";
import { Post } from "./entity/Post";
import { PostBigInt } from "./entity/PostBigInt";

describe("repository > increment method", () => {

    describe("basic", () => {

        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            entities: [Post]
        }));
        beforeEach(() => reloadTestingDatabases(connections));
        after(() => closeTestingConnections(connections));

        it("should increment value", () => Promise.all(connections.map(async connection => {

            // save few dummy posts
            const post1 = new Post();
            post1.id = 1;
            post1.title = "post #1";
            post1.counter = 1;
            const post2 = new Post();
            post2.id = 2;
            post2.title = "post #2";
            post2.counter = 1;
            await connection.manager.save([post1, post2]);

            // increment counter of post 1
            await connection
                .getRepository(Post)
                .increment({ id: 1 }, "counter", 1);

            // increment counter of post 2
            await connection
                .manager
                .increment(Post, { id: 2 }, "counter", 3);

            // load and check counter
            const loadedPost1 = await connection.manager.findOne(Post, 1);
            loadedPost1!.counter.should.be.equal(2);

            const loadedPost2 = await connection.manager.findOne(Post, 2);
            loadedPost2!.counter.should.be.equal(4);
        })));

        it("should accept string as input and increment value", () => Promise.all(connections.map(async connection => {

            // save few dummy posts
            const post1 = new Post();
            post1.id = 1;
            post1.title = "post #1";
            post1.counter = 1;
            const post2 = new Post();
            post2.id = 2;
            post2.title = "post #2";
            post2.counter = 1;
            await connection.manager.save([post1, post2]);

            // increment counter of post 1
            await connection
                .getRepository(Post)
                .increment({ id: 1 }, "counter", "22");

            // increment counter of post 2
            await connection
                .manager
                .increment(Post, { id: 2 }, "counter", "33");

            // load and check counter
            const loadedPost1 = await connection.manager.findOne(Post, 1);
            loadedPost1!.counter.should.be.equal(23);

            const loadedPost2 = await connection.manager.findOne(Post, 2);
            loadedPost2!.counter.should.be.equal(34);
        })));

        it("should throw an error if column property path was not found", () => Promise.all(connections.map(async connection => {

            // save few dummy posts
            const post1 = new Post();
            post1.id = 1;
            post1.title = "post #1";
            post1.counter = 1;
            const post2 = new Post();
            post2.id = 2;
            post2.title = "post #2";
            post2.counter = 1;
            await connection.manager.save([post1, post2]);

            // increment counter of post 1
            await connection
                .getRepository(Post)
                .increment({ id: 1 }, "unknownProperty", 1)
                .should.be.rejected;

        })));

        it("should throw an error if input value is not number", () => Promise.all(connections.map(async connection => {

            // save few dummy posts
            const post1 = new Post();
            post1.id = 1;
            post1.title = "post #1";
            post1.counter = 1;
            const post2 = new Post();
            post2.id = 2;
            post2.title = "post #2";
            post2.counter = 1;
            await connection.manager.save([post1, post2]);

            // increment counter of post 1
            await connection
                .getRepository(Post)
                .increment({ id: 1 }, "counter", "12abc")
                .should.be.rejected;

        })));

    });

    describe("bigint", () => {

        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            entities: [PostBigInt],
            enabledDrivers: ["mysql", "mariadb", "postgres"],
            // logging: true
        }));
        beforeEach(() => reloadTestingDatabases(connections));
        after(() => closeTestingConnections(connections));

        it("should increment value", () => Promise.all(connections.map(async connection => {

            // save few dummy posts
            const postBigInt1 = new PostBigInt();
            postBigInt1.id = 1;
            postBigInt1.title = "post #1";
            postBigInt1.counter = "1";
            const postBigInt2 = new PostBigInt();
            postBigInt2.id = 2;
            postBigInt2.title = "post #2";
            postBigInt2.counter = "2";
            await connection.manager.save([postBigInt1, postBigInt2]);

            // increment counter of post 1
            await connection
                .getRepository(PostBigInt)
                .increment({ id: 1 }, "counter", "9000000000000000000");

            // increment counter of post 2
            await connection
                .manager
                .increment(PostBigInt, { id: 2 }, "counter", "9000000000000000000");

            // load and check counter
            const loadedPost1 = await connection.manager.findOne(PostBigInt, 1);
            loadedPost1!.counter.should.be.equal("9000000000000000001");

            const loadedPost2 = await connection.manager.findOne(PostBigInt, 2);
            loadedPost2!.counter.should.be.equal("9000000000000000002");

        })));

    });

});
