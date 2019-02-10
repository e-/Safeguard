import { Query } from './query';
import { Job } from './job';

export abstract class Scheduler {
    abstract schedule(jobs: Job[]): Job[];
}

export class FIFOScheduler extends Scheduler {
    schedule(jobs: Job[]): Job[] {
        jobs.sort((a, b) => {
            if (a.id < b.id) return -1;
            else if (a.id > b.id) return 1;

            if (a.index < b.index) return -1;
            else if (a.index > b.index) return 1;

            return 0;
        });

        return jobs;
    }
}

export class RoundRobinScheduler extends Scheduler {
    schedule(jobs: Job[]) {
        let minIndex = {};

        jobs.forEach(job => {
            const qid = job.query.id;
            if(!minIndex[qid]) minIndex[qid] = job.index;
            if(minIndex[qid] > job.index) minIndex[qid] = job.index;
        });

        jobs.sort((a, b) => {
            const aindex = a.index - minIndex[a.query.id];
            const bindex = b.index - minIndex[b.query.id];

            if (aindex < bindex) return -1;
            else if (aindex > bindex) return 1;

            if (a.id < b.id) return -1;
            else if (a.id > b.id) return 1;

            return 0;
        });

        return jobs;
    }
}

export class QueryOrderScheduler extends Scheduler {
    constructor(public queries: Query[]) {
        super();
    }

    schedule(jobs: Job[]) {
        const order = {};
        this.queries.forEach((q, i) => {
            order[q.id] = i;
        });

        jobs.sort((a, b) => {
            if(order[a.query.id] !== order[b.query.id]) {
                return order[a.query.id] - order[b.query.id];
            }

            return a.index - b.index;
        });

        return jobs;
    }
}
