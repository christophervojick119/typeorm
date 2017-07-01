import {Entity} from "../../../../src/decorator/entity/Entity";
import {Column} from "../../../../src/decorator/columns/Column";
import {PrimaryColumn} from "../../../../src/decorator/columns/PrimaryColumn";
import {ManyToOne} from "../../../../src/decorator/relations/ManyToOne";
import {Group} from "./Group";

@Entity()
export class Player {

    @PrimaryColumn()
    email: string;

    @ManyToOne(type => Group)
    group: Group;

}