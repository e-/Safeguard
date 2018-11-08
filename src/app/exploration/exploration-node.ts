import { Query } from "../data/query";
import { isNull } from "util";
import { Constants } from '../constants';
import { NumericalOrdering, OrderingDirection } from "../data/ordering";
import { FieldTrait } from "../data/field";

export class Visual {
    top: number = 0;
    left: number = 0;
    width: number = 0;
    height: number = 0;
    depth: number = 0;
    childrenHeight: number = 0;

    bottom(withMargin: boolean = false) {
        if (withMargin) return this.top + this.height + Constants.rowSpace;
        return this.top + this.height;
    }

    right() {
        return this.left + this.width;
    }

    verticalCenter() {
        return this.top + this.height / 2;
    }
}

export enum NodeState {
    Running = "Running",
    Paused = "Paused"
};

export class ExplorationNode {
    children: ExplorationNode[] = [];
    visual: Visual = new Visual();

    domainStart = Number.MAX_VALUE;
    domainEnd = -Number.MAX_VALUE;
    maxUncertainty = 0;

    updateAutomatically = true;
    state:NodeState = NodeState.Running;

    constructor(public parent: ExplorationNode, public fields: FieldTrait[], public query: Query | null) {
    }

    hasChildren() {
        return this.children.length > 0;
    }

    isLeaf() {
        return this.children.length === 0;
    }

    firstChild() {
        return this.children[0];
    }

    lastChild() {
        return this.children[this.children.length - 1];
    }

    addChild(child: ExplorationNode) {
        this.children.push(child);
    }

    isRoot() {
        return isNull(this.parent);
    }

    pause() {
        this.state = NodeState.Paused;
    }

    run() {
        this.state = NodeState.Running;
    }
}
