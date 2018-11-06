import { Dataset } from './dataset';
import { FieldTrait, VlType, FieldGroupedValueList } from './field';
import { assert, assertIn } from './assert';
import { AccumulatorTrait, SumAccumulator, CountAccumulator, AccumulatedValue, MeanAccumulator } from './accum';
import { Sampler, UniformRandomSampler } from './sampler';
import { AggregateJob } from './job';
import { GroupBy } from './groupby';
import { Queue } from './queue';
import { Job } from './job';
import { ServerError } from './exception';
import { Progress } from './progress';
import { OrderingType, NumericalOrdering, OrderingDirection } from './ordering';
import { ConfidenceInterval, ApproximatorTrait, SumApproximator, CountApproximator, MeanApproximator } from './approx';
import { AccumulatedKeyValues, PartialKeyValue } from './keyvalue';

export abstract class Query {
    id: number;
    static Id = 1;
    progress: Progress = new Progress();
    name: string;
    result: AccumulatedKeyValues;
    lastUpdated: number = +new Date(); // epoch
    defaultOrdering = NumericalOrdering;
    defaultOrderingGetter = d => d;
    defaultOrderingDirection = OrderingDirection.Descending;
    jobs: Job[];

    constructor(public dataset: Dataset, public sampler: Sampler) {
        this.id = Query.Id++;
        this.jobs = [];
    }

    resultList(): [FieldGroupedValueList, AccumulatedValue][] {
        return Object.keys(this.result).map<[FieldGroupedValueList, AccumulatedValue]>(key =>
            [this.result[key].key, this.result[key].value]
        );
    }

    abstract accumulate(job: Job, partialKeyValues: PartialKeyValue[]);
    abstract combine(field: FieldTrait): Query;
    abstract compatible(fields: FieldTrait[]): FieldTrait[];
    abstract desc(): string;
}

/**
 * Represent an empty query (a query placeholder for the root node)
 */
export class EmptyQuery extends Query {
    name = "EmptyQuery";

    constructor(public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(dataset, sampler);
    }

    accumulate(job: Job, partialResponses: PartialKeyValue[]) {
        this.lastUpdated = +new Date();
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new Histogram1DQuery(field, this.dataset, this.sampler);
        }
        else if ([VlType.Ordinal, VlType.Nominal, VlType.Dozen].includes(field.vlType)) {
            return new Frequency1DQuery(field, this.dataset, this.sampler);
        }

        throw new ServerError("EmptyQuery + [Q, O, N, D]");
    }

    compatible(fields: FieldTrait[]) {
        return fields.filter(field => field.vlType !== VlType.Key);
    }

    desc() {
        return this.name;
    }
}

/**
 * represent an aggregate query such as min(age) by occupation
 * one quantitative, multiple categoricals
 */
export class AggregateQuery extends Query {
    name = "AggregateQuery";
    result: AccumulatedKeyValues = {};
    defaultOrdering = NumericalOrdering;
    defaultOrderingGetter = d => (d.ci3stdev as ConfidenceInterval).center;

    /**
     *
     * @param accumulator
     * @param target can be null only when accumulator = Count
     * @param dataset
     * @param groupBy
     * @param sampler
     */
    constructor(
        public accumulator: AccumulatorTrait,
        public approximator: ApproximatorTrait,
        public target: FieldTrait,
        public dataset: Dataset,
        public groupBy: GroupBy,
        public sampler: Sampler = new UniformRandomSampler(100)
    ) {
        super(dataset, sampler);

        // create samples
        let samples = this.sampler.sample(this.dataset.rows.length);

        this.progress.totalBlocks = samples.length;
        this.progress.totalRows = dataset.length;

        this.jobs = samples.map((sample, i) =>
            new AggregateJob(
                this.accumulator,
                this.target,
                this.dataset,
                this.groupBy,
                this,
                i,
                sample));
    }

    accumulate(job: AggregateJob, partialResponses: PartialKeyValue[]) {
        this.lastUpdated = +new Date();

        this.progress.processedRows += job.sample.length;
        this.progress.processedBlocks++;

        partialResponses.forEach(pres => {
            const hash = pres.key.hash;

            if (!this.result[hash])
                this.result[hash] = {
                    key: pres.key,
                    value: this.accumulator.initAccumulatedValue
                };

            this.result[hash].value =
                this.accumulator.accumulate(this.result[hash].value, pres.value);
        });
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative && this.target === null) {
            return new AggregateQuery(
                new MeanAccumulator(),
                new MeanApproximator(),
                field,
                this.dataset,
                this.groupBy,
                this.sampler
            );
        }

        return new AggregateQuery(
            this.accumulator,
            this.approximator,
            this.target,
            this.dataset,
            new GroupBy(this.groupBy.fields.concat(field)),
            this.sampler
        );
    }

    compatible(fields: FieldTrait[]) {
        return fields.filter(field => field.vlType !== VlType.Key);
    }

    desc() {
        let desc = `${this.accumulator.name}(${this.target ? this.target.name : '*'}) `;

        if (this.groupBy.fields.length > 0) {
            desc += 'group by ' + this.groupBy.fields.map(f => f.name).join(', ');
        }

        return desc;
    }
}

/**
 * one quantitative
 */
export class Histogram1DQuery extends AggregateQuery {
    name = "Histogram1DQuery";
    defaultOrdering = NumericalOrdering;
    defaultOrderingDirection = OrderingDirection.Ascending;
    defaultOrderingGetter = d => (d.keys as FieldGroupedValueList).list[0].groupId;

    constructor(public grouping: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            sampler);

        assert(grouping.vlType, VlType.Quantitative);
    }

    combine(field: FieldTrait) {
        return new AggregateQuery(
            new MeanAccumulator(),
            new MeanApproximator(),
            this.grouping,
            this.dataset,
            new GroupBy([field]),
            this.sampler);
    }
}

/**
 * one categorical
 */
export class Frequency1DQuery extends AggregateQuery {
    name = "Frequency1DQuery";
    defaultOrdering = NumericalOrdering;
    defaultOrderingGetter = d => (d.ci3stdev as ConfidenceInterval).center;

    constructor(public grouping: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            sampler);

        assertIn(grouping.vlType, [VlType.Dozen, VlType.Nominal, VlType.Ordinal]);
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new AggregateQuery(
                new MeanAccumulator(),
                new MeanApproximator(),
                field,
                this.dataset,
                new GroupBy([this.grouping]),
                this.sampler);
        }
        return new AggregateQuery(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            this.dataset,
            new GroupBy([this.grouping, field]),
            this.sampler);
    }
}




