import "reflect-metadata";
import {Post} from "./entity/Post";
import {Image} from "./entity/Image";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {expect} from "chai";
import {Connection} from "../../../../../src/connection/Connection";

describe.only("query builder > relational query builder > add and remove operations > many to many relation", () => {

    let connections: Connection[];
    let image1: Image,
        image2: Image,
        image3: Image,
        post1: Post,
        post2: Post,
        post3: Post,
        loadedPost1: Post|undefined,
        loadedPost2: Post|undefined,
        loadedPost3: Post|undefined;

    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        dropSchema: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    async function prepareData(connection: Connection) {

        image1 = new Image();
        image1.url = "image #1";
        await connection.manager.save(image1);

        image2 = new Image();
        image2.url = "image #2";
        await connection.manager.save(image2);

        image3 = new Image();
        image3.url = "image #3";
        await connection.manager.save(image3);

        post1 = new Post();
        post1.title = "post #1";
        await connection.manager.save(post1);

        post2 = new Post();
        post2.title = "post #2";
        await connection.manager.save(post2);

        post3 = new Post();
        post3.title = "post #3";
        await connection.manager.save(post3);
    }

    it("should add entity relation of a given entity by entity objects", () => Promise.all(connections.map(async connection => {
        await prepareData(connection);

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of(image1)
            .add(post1);

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.contain({ id: 1, url: "image #1" });

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.be.empty;

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of(image1)
            .remove(post1);

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.not.contain({ id: 1, url: "image #1" });

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.be.empty;
    })));

    it("should add entity relation of a given entity by entity id", () => Promise.all(connections.map(async connection => {
        await prepareData(connection);

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of(2) // image id
            .add(2); // post id

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.be.empty;

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.contain({ id: 2, url: "image #2" });

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.be.empty;

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of(2) // image id
            .remove(2); // post id

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.be.empty;

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.not.contain({ id: 2, url: "image #2" });

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.be.empty;
    })));

    it("should add entity relation of a given entity by entity id map", () => Promise.all(connections.map(async connection => {
        await prepareData(connection);

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of({ id: 3 }) // image id
            .add({ id: 3 }); // post id

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.be.empty;

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.contain({ id: 3, url: "image #3" });

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of({ id: 3 }) // image id
            .remove({ id: 3 }); // post id

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.be.empty;

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.not.contain({ id: 3, url: "image #3" });
    })));

    it("should add entity relation of a multiple entities", () => Promise.all(connections.map(async connection => {
        await prepareData(connection);

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of([{ id: 1 }, { id: 3 }]) // images
            .add({ id: 3 }); // post

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.be.empty;

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.contain({ id: 1, url: "image #1" });
        expect(loadedPost3!.images).to.contain({ id: 3, url: "image #3" });

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of([{ id: 1 }, { id: 3 }]) // images
            .remove({ id: 3 }); // post

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.be.empty;

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.not.contain({ id: 1, url: "image #1" });
        expect(loadedPost3!.images).to.not.contain({ id: 3, url: "image #3" });
    })));

    it("should add multiple entities into relation of a multiple entities", () => Promise.all(connections.map(async connection => {
        await prepareData(connection);

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of({ id: 3 }) // image
            .add([{ id: 1 }, { id: 3 }]); // posts

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.contain({ id: 3, url: "image #3" });

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.contain({ id: 3, url: "image #3" });

        await connection
            .createQueryBuilder()
            .relation(Image, "posts")
            .of({ id: 3 }) // image
            .remove([{ id: 1 }, { id: 3 }]); // posts

        loadedPost1 = await connection.manager.findOneById(Post, 1, { relations: ["images"] });
        expect(loadedPost1!.images).to.not.contain({ id: 3, url: "image #3" });

        loadedPost2 = await connection.manager.findOneById(Post, 2, { relations: ["images"] });
        expect(loadedPost2!.images).to.be.empty;

        loadedPost3 = await connection.manager.findOneById(Post, 3, { relations: ["images"] });
        expect(loadedPost3!.images).to.not.contain({ id: 3, url: "image #3" });
    })));

});
