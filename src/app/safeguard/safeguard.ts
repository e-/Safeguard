import { Operators } from './operator';
import { ConstantTrait, ValueConstant, RankConstant, RangeConstant, NormalConstant, PowerLawConstant, LinearConstant } from './constant';
import { VariableTrait, VariablePair, DistributiveVariable, CombinedVariablePair } from './variable';
import { NormalDistribution } from './normal';
import {
    ValueEstimator, RankEstimator, RangeEstimator, ComparativeEstimator,
    NormalEstimator, PowerLawEstimator, LinearRegressionEstimator, MinMaxValueEstimator, MinMaxRankValueEstimator, MinMaxComparativeEstimator
} from './estimate';
import { ValidityTypes, Validity } from './validity';
import { AggregateQuery } from '../data/query';
import { Dataset } from '../data/dataset';
import { Constants } from '../constants';

const ValueEstimate = new ValueEstimator().estimate;
const MinMaxValueEstimate = new MinMaxValueEstimator().estimate
const RankEstimate = new RankEstimator().estimate;
const MinMaxRankEstimate = new MinMaxRankValueEstimator().estimate;
const RangeEstimate = new RangeEstimator().estimate;
const MinMaxRangeEstimate = new RangeEstimator().estimate;
const ComparativeEstimate = new ComparativeEstimator().estimate;
const MinMaxComparativeEstimate = new MinMaxComparativeEstimator().estimate;
const PowerLawEstimate = new PowerLawEstimator().estimate;
const NormalEstimate = new NormalEstimator().estimate;
const LinearRegressionEstimate = new LinearRegressionEstimator().estimate;

export enum SafeguardTypes {
    None = 'None',
    Value = 'Value',
    Rank = 'Rank',
    Range = 'Range',
    Comparative = 'Comparative',
    PowerLaw = 'PowerLaw',
    Normal = 'Normal',
    Linear = 'Linear'
}

export const DistributiveSafeguardTypes = [SafeguardTypes.PowerLaw, SafeguardTypes.Normal, SafeguardTypes.Linear];

export abstract class Safeguard {
    static normal = new NormalDistribution();
    createdAt: Date;
    validityType: ValidityTypes;
    history: Validity[] = [];
    lastUpdated: number;
    lastUpdatedAt: Date;

    id: number;

    constructor(
        public type: SafeguardTypes,
        public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public query: AggregateQuery
    ) {
        this.createdAt = new Date();
        this.lastUpdatedAt = new Date();
        this.lastUpdated = +new Date();
    }

    validity(): Validity {
        throw new Error('validity() must be implemented');
    }

    toLog() {
        return {
            type: this.type,
            variable: this.variable.toLog(),
            constant: this.constant ? this.constant.toLog() : null,
            query: this.query.toLog(),
            validity: this.validity()
        };
    }

    toJSON(): any {
        return {
            id: this.id,
            type: this.type,
            variable: this.variable.toJSON(),
            operator: this.operator,
            constant: this.constant ? this.constant.toJSON() : null,
            queryId: this.query.id
        }
    }

    isP() {
        return (this.type == SafeguardTypes.Value ||
            this.type == SafeguardTypes.Rank ||
            this.type == SafeguardTypes.Comparative ||
            this.type == SafeguardTypes.Range
            ) && this.query.approximator.estimatable;
    }

    isBoolean() {
        return (this.type == SafeguardTypes.Value ||
            this.type == SafeguardTypes.Rank ||
            this.type == SafeguardTypes.Comparative ||
            this.type == SafeguardTypes.Range
            ) && !this.query.approximator.estimatable
    }

    isQuality() {
        return this.type == SafeguardTypes.PowerLaw ||
        this.type == SafeguardTypes.Normal;
    }


    isError() {
        return this.type == SafeguardTypes.Linear;
    }

    validityName() {
        if(this.isP()) return Constants.locale.P;
        if(this.isQuality()) return Constants.locale.KSStatistic;
        if(this.isError()) return Constants.locale.RMSE;
    }

    static fromJSON(json: any, dataset: Dataset, query: AggregateQuery) {
        // returns a safeguard without a query.

        const safeguardType = json.type;
        const variable = VariableTrait.fromJSON(json.variable, dataset);
        const operator = json.operator;
        const constant = json.constant ? ConstantTrait.fromJSON(json.constant) : null;
        let sg: Safeguard;

        if(safeguardType == SafeguardTypes.Value) {
            sg = new ValueSafeguard(variable, operator, constant, query);
        }

        if(safeguardType == SafeguardTypes.Rank) {
            sg =  new RankSafeguard(variable, operator, constant, query);
        }

        if(safeguardType == SafeguardTypes.Range) {
            sg = new RangeSafeguard(variable, constant, query);
        }

        if(safeguardType == SafeguardTypes.Comparative) {
            sg = new ComparativeSafeguard(variable as any, operator, query);
        }

        if(safeguardType == SafeguardTypes.PowerLaw) {
            sg = new PowerLawSafeguard(constant, query);
        }

        if(safeguardType == SafeguardTypes.Normal) {
            sg = new NormalSafeguard(constant, query);
        }

        if(safeguardType == SafeguardTypes.Linear) {
            sg = new LinearSafeguard(constant, query);
        }

        if(!sg)
            throw new Error(`Invalid safeguard spec: ${JSON.stringify(json)}`);

        sg.id = json.id;

        return sg;
    }
}

export abstract class DistributiveSafeguard extends Safeguard {
    updateConstant() { };
}

export class ValueSafeguard extends Safeguard {
    readonly validityType = ValidityTypes.PValue;
    readonly type = SafeguardTypes.Value;

    constructor(public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Value, variable, operator, constant, query);
    }

    p() {
        return ValueEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as ValueConstant);
    }

    t() {  // min or max
        return MinMaxValueEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as ValueConstant);
    }

    validity() {
        if (this.query.approximator.estimatable) return this.p();
        return this.t();
    }
}

export class RankSafeguard extends Safeguard {
    readonly validityType = ValidityTypes.PValue;
    readonly type = SafeguardTypes.Rank;

    constructor(public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Rank, variable, operator, constant, query);
    }

    p() {
        return RankEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as RankConstant);
    }

    t() {  // min or max
        return MinMaxRankEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as RankConstant);
    }

    validity() {
        if (this.query.approximator.estimatable) return this.p();
        return this.t();
    }
}

export class RangeSafeguard extends Safeguard {
    readonly validityType = ValidityTypes.PValue;
    readonly type = SafeguardTypes.Range;

    constructor(public variable: VariableTrait,
        public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Range, variable, Operators.InRange, constant, query);
    }

    p() {
        return RangeEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as RangeConstant);
    }

    t() {  // min or max
        return MinMaxRangeEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as RangeConstant);
    }

    validity() {
        if (this.query.approximator.estimatable) return this.p();
        return this.t();
    }
}

export class ComparativeSafeguard extends Safeguard {
    readonly validityType = ValidityTypes.PValue;
    readonly type = SafeguardTypes.Comparative;

    constructor(public variable: VariablePair | CombinedVariablePair,
        public operator: Operators,
        public query: AggregateQuery) {
        super(SafeguardTypes.Comparative, variable, operator, null, query);
    }

    p() {
        if (this.variable.isRank)
            throw new Error('Cannot estimate the p value for rank');

        return ComparativeEstimate(
            this.query,
            this.variable,
            this.operator);
    }

    t() {
        return MinMaxComparativeEstimate(this.query, this.variable, this.operator);
    }

    validity() {
        if (this.query.approximator.estimatable) return this.p();
        return this.t();
    }
}

export class PowerLawSafeguard extends DistributiveSafeguard {
    readonly validityType = ValidityTypes.Quality;
    readonly type = SafeguardTypes.PowerLaw;

    constructor(public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.PowerLaw,
            new DistributiveVariable(),
            Operators.Follow,
            constant, query);
    }

    q() {
        return PowerLawEstimate(
            this.query,
            this.constant as PowerLawConstant
        );
    }

    validity() {
        return this.q();
    }

    updateConstant() {
        this.constant = PowerLawConstant.FitFromVisData(this.query.getRecentData());
    }
}

export class NormalSafeguard extends DistributiveSafeguard {
    readonly validityType = ValidityTypes.Quality;
    readonly type = SafeguardTypes.Normal;

    constructor(public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Normal,
            new DistributiveVariable(),
            Operators.Follow,
            constant, query);
    }

    q() {
        return NormalEstimate(
            this.query,
            this.constant as NormalConstant);
    }

    validity() {
        return this.q();
    }

    updateConstant() {
        this.constant = NormalConstant.FitFromVisData(this.query.getRecentData());
    }
}

export class LinearSafeguard extends DistributiveSafeguard {
    readonly validityType = ValidityTypes.Error;
    readonly type = SafeguardTypes.Linear;

    constructor(public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Linear,
            new DistributiveVariable(),
            Operators.Follow,
            constant, query);
    }

    e() {
        return LinearRegressionEstimate(
            this.query,
            this.constant as LinearConstant
        )
    }

    validity() {
        return this.e();
    }

    updateConstant() {
        this.constant = LinearConstant.FitFromVisData(this.query.getRecentData());
    }
}
