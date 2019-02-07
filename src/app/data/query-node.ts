import { AggregateQuery } from "./query";
import { FieldTrait } from "./field";


export enum NodeState {
    Running = "Running",
    Paused = "Paused"
};

export class QueryNode {
    domainStart = Number.MAX_VALUE;
    domainEnd = -Number.MAX_VALUE;
    maxUncertainty = 0;

    state:NodeState = NodeState.Running;

    constructor(public fields: FieldTrait[], public query: AggregateQuery | null) {
    }

    pause() {
        this.state = NodeState.Paused;
    }

    run() {
        this.state = NodeState.Running;
    }
}