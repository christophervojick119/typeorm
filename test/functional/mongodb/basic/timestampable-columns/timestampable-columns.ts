import "reflect-metadata";
import {Connection} from "../../../../../src/connection/Connection";
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases
} from "../../../../utils/test-utils";
import {Post} from "./entity/Post";
import {expect} from "chai";

describe("mongodb > timestampable columns", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [Post],
        enabledDrivers: ["mongodb"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should persist timestampable columns", () => Promise.all(connections.map(async connection => {
        const commentMongoRepository = connection.getMongoRepository(Post);

        // save a post
        const post = new Post();
        post.message = "Hello";
        await commentMongoRepository.save(post);
        expect(post.id).to.be.not.undefined;
        post.createdAt.should.be.instanceof(Date);
        const createdAt = post.createdAt;

        post.updatedAt.should.be.instanceof(Date);
        const updatedAt = post.updatedAt;

        expect(post.createdAt.getTime()).to.equal(post.updatedAt.getTime());

        // update
        const date = new Date();
        date.setFullYear(2001);

        post.message = "New message";
        post.createdAt = date;
        post.updatedAt = date;

        await commentMongoRepository.save(post);

        const updatedPost = await commentMongoRepository.findOne(post.id);

        expect(updatedPost).to.be.ok;

        expect((updatedPost as Post).createdAt.getTime()).to.equal(createdAt.getTime());
        expect((updatedPost as Post).updatedAt.getTime()).to.gte(updatedAt.getTime());
    })));

});

