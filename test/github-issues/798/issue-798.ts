import "reflect-metadata"
import * as assert from "assert"
import { DataSource } from "../../../src"
import { getTypeOrmConfig } from "../../utils/test-utils"

describe("github issues > #798 sqlite: 'database' path in ormconfig.json is not relative", () => {
    let dataSource: DataSource
    const oldCwd = process.cwd()

    before(function () {
        process.chdir("..")
    })

    after(function () {
        process.chdir(oldCwd)
    })

    afterEach(() => {
        if (dataSource && dataSource.isInitialized) {
            dataSource.close()
        }
    })

    it("should find the sqlite database if the cwd is changed", async function () {
        // run test only if sqlite3 is enabled in ormconfig
        const config = getTypeOrmConfig().find(
            (conf) => conf.type === "sqlite" && conf.skip === false,
        )
        if (!config) return

        const dataSource = new DataSource(config)
        await dataSource.initialize()

        assert.strictEqual(dataSource.isInitialized, true)
    })

    it("should find the sqlite database if the cwd is changed for better-sqlite3", async function () {
        // run test only if sqlite3 is enabled in ormconfig
        const config = getTypeOrmConfig().find(
            (conf) => conf.type === "better-sqlite3" && conf.skip === false,
        )
        if (!config) return

        const dataSource = new DataSource(config)
        await dataSource.initialize()

        assert.strictEqual(dataSource.isInitialized, true)
    })
})
