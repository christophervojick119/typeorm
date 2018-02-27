import "reflect-metadata";
import {Connection} from "../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {expect} from "chai";
import {PromiseUtils} from "../../../src";
import {AbstractSqliteDriver} from "../../../src/driver/sqlite-abstract/AbstractSqliteDriver";
import {PostgresDriver} from "../../../src/driver/postgres/PostgresDriver";
import {SqlServerDriver} from "../../../src/driver/sqlserver/SqlServerDriver";
import {Post} from "./entity/Post";
import {PostVersion} from "./entity/PostVersion";

describe("schema builder > change column", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            // enabledDrivers: ["mssql"],
            schemaCreate: true,
            dropSchema: true,
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should correctly change column name", () => PromiseUtils.runInSequence(connections, async connection => {
        const postMetadata = connection.getMetadata(Post);
        const nameColumn = postMetadata.findColumnWithPropertyName("name")!;
        nameColumn.propertyName = "title";
        nameColumn.build(connection);

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        expect(postTable!.findColumnByName("name")).to.be.undefined;
        postTable!.findColumnByName("title")!.should.be.exist;

        // revert changes
        nameColumn.propertyName = "name";
        nameColumn.build(connection);
    }));

    it.only("should correctly change column length", () => PromiseUtils.runInSequence(connections, async connection => {
        const postMetadata = connection.getMetadata(Post);
        const nameColumn = postMetadata.findColumnWithPropertyName("name")!;
        const textColumn = postMetadata.findColumnWithPropertyName("text")!;
        nameColumn.length = "500";
        textColumn.length = "1000";

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        postTable!.findColumnByName("name")!.length.should.be.equal("500");
        postTable!.findColumnByName("text")!.length.should.be.equal("1000");

        // revert changes
        nameColumn.length = "255";
        textColumn.length = "255";
    }));

    it("should correctly change column type", () => PromiseUtils.runInSequence(connections, async connection => {
        const postMetadata = connection.getMetadata(Post);
        const versionColumn = postMetadata.findColumnWithPropertyName("version")!;
        versionColumn.type = "int";

        // in test we must manually change referenced column too, but in real sync, it changes automatically
        const postVersionMetadata = connection.getMetadata(PostVersion);
        const postVersionColumn = postVersionMetadata.findColumnWithPropertyName("post")!;
        postVersionColumn.type = "int";

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postVersionTable = await queryRunner.getTable("post_version");
        await queryRunner.release();

        postVersionTable!.foreignKeys.length.should.be.equal(1);

        // revert changes
        versionColumn.type = "varchar";
        postVersionColumn.type = "varchar";
    }));

    it("should correctly make column primary and generated", () => PromiseUtils.runInSequence(connections, async connection => {
        const postMetadata = connection.getMetadata(Post);
        const idColumn = postMetadata.findColumnWithPropertyName("id")!;
        const versionColumn = postMetadata.findColumnWithPropertyName("version")!;
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "increment";

        // SQLite does not support AUTOINCREMENT with composite primary keys
        if (!(connection.driver instanceof AbstractSqliteDriver))
            versionColumn.isPrimary = true;

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        postTable!.findColumnByName("id")!.isGenerated.should.be.true;
        postTable!.findColumnByName("id")!.generationStrategy!.should.be.equal("increment");

        // SQLite does not support AUTOINCREMENT with composite primary keys
        if (!(connection.driver instanceof AbstractSqliteDriver))
            postTable!.findColumnByName("version")!.isPrimary.should.be.true;

        // revert changes
        idColumn.isGenerated = false;
        idColumn.generationStrategy = undefined;
        versionColumn.isPrimary = false;
    }));

    it("should correctly change column `isGenerated` property when column is on foreign key", () => PromiseUtils.runInSequence(connections, async connection => {
        const teacherMetadata = connection.getMetadata("teacher");
        const idColumn = teacherMetadata.findColumnWithPropertyName("id")!;
        idColumn.isGenerated = false;
        idColumn.generationStrategy = undefined;

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const teacherTable = await queryRunner.getTable("teacher");
        await queryRunner.release();

        teacherTable!.findColumnByName("id")!.isGenerated.should.be.false;
        expect(teacherTable!.findColumnByName("id")!.generationStrategy).to.be.undefined;

        // revert changes
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "increment";

    }));

    it("should correctly change non-generated column on to uuid-generated column", () => PromiseUtils.runInSequence(connections, async connection => {
        const postMetadata = connection.getMetadata(Post);
        const idColumn = postMetadata.findColumnWithPropertyName("id")!;
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "uuid";

        // depending on driver, we must change column and referenced column types
        if (connection.driver instanceof PostgresDriver) {
            idColumn.type = "uuid";
        } else if (connection.driver instanceof SqlServerDriver) {
            idColumn.type = "uniqueidentifier";
        } else {
            idColumn.type = "varchar";
        }

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        if (connection.driver instanceof PostgresDriver || connection.driver instanceof SqlServerDriver) {
            postTable!.findColumnByName("id")!.isGenerated.should.be.true;
            postTable!.findColumnByName("id")!.generationStrategy!.should.be.equal("uuid");

        } else {
            // other driver does not natively supports uuid type
            postTable!.findColumnByName("id")!.isGenerated.should.be.false;
            expect(postTable!.findColumnByName("id")!.generationStrategy).to.be.undefined;
        }

        // revert changes
        idColumn.isGenerated = false;
        idColumn.generationStrategy = undefined;
        idColumn.type = "int";

    }));

    it("should correctly change generated column generation strategy", () => PromiseUtils.runInSequence(connections, async connection => {
        const teacherMetadata = connection.getMetadata("teacher");
        const studentMetadata = connection.getMetadata("student");
        const idColumn = teacherMetadata.findColumnWithPropertyName("id")!;
        const teacherColumn = studentMetadata.findColumnWithPropertyName("teacher")!;
        idColumn.generationStrategy = "uuid";

        // depending on driver, we must change column and referenced column types
        if (connection.driver instanceof PostgresDriver) {
            idColumn.type = "uuid";
            teacherColumn.type = "uuid";
        } else if (connection.driver instanceof SqlServerDriver) {
            idColumn.type = "uniqueidentifier";
            teacherColumn.type = "uniqueidentifier";
        } else {
            idColumn.type = "varchar";
            teacherColumn.type = "varchar";
        }

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const teacherTable = await queryRunner.getTable("teacher");
        await queryRunner.release();

        if (connection.driver instanceof PostgresDriver || connection.driver instanceof SqlServerDriver) {
            teacherTable!.findColumnByName("id")!.isGenerated.should.be.true;
            teacherTable!.findColumnByName("id")!.generationStrategy!.should.be.equal("uuid");

        } else {
            // other driver does not natively supports uuid type
            teacherTable!.findColumnByName("id")!.isGenerated.should.be.false;
            expect(teacherTable!.findColumnByName("id")!.generationStrategy).to.be.undefined;
        }

        // revert changes
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "increment";
        idColumn.type = "int";
        teacherColumn.type = "int";

    }));

});
