import {Column, Entity, PrimaryGeneratedColumn} from "../../../../src";

enum StandardSetType {
    AcademicStandard = "AcademicStandard",
    FoundationalKnowledge = "FoundationalKnowledge",
    AchievementDescriptor = "AchievementDescriptor",
}

@Entity()
export class TestEntity {
    @PrimaryGeneratedColumn()
    ud: number

    @Column("enum", { enum: StandardSetType, name: "type" })
    type: StandardSetType;
}
