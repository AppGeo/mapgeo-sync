import * as schedule from 'node-schedule';
import * as Store from 'electron-store';
import { RecurrenceRule, Range } from 'node-schedule';
import { SyncStoreType } from './store/store';
import { SyncRule, SyncState } from 'mapgeo-sync-config';
import { QueryActionResponse } from './workers/query-action';

type UpdateSyncStateFn = (
  rule: SyncRule,
  data: Omit<Partial<SyncState>, 'id'>
) => SyncState;

interface ScheduledRule {
  ruleId: string;
  job: schedule.Job;
}

export default class Scheduler {
  private store: Store<SyncStoreType>;
  private job: schedule.Job;
  private updateSyncState: UpdateSyncStateFn;
  private run: (rule: SyncRule) => Promise<QueryActionResponse>;
  private scheduled: ScheduledRule[] = [];

  constructor({
    store,
    updateSyncState,
    run,
  }: {
    store: Store<SyncStoreType>;
    updateSyncState: UpdateSyncStateFn;
    run: (rule: SyncRule) => Promise<QueryActionResponse>;
  }) {
    this.store = store;
    this.updateSyncState = updateSyncState;
    this.run = run;
    this.autoStartScheduled();
  }

  /**
   * Automatically setup jobs for rules that have been scheduled on app start
   */
  autoStartScheduled() {
    console.log('calling autoStartScheduled');
    const syncState = this.store.get('syncState') || [];
    console.log('syncState', syncState);
    const scheduledOnly = syncState.filter((item) => item.scheduled);
    const scheduledRuleIds = scheduledOnly.map((item) => item.ruleId);
    console.log('scheduled rule ids', scheduledRuleIds);
    const rules = this.store
      .get('syncRules')
      .filter((rule) => rule.schedule && scheduledRuleIds.includes(rule.id));
    console.log('rules', rules);

    rules.forEach((rule) => {
      this.scheduleRule(rule);
    });
  }

  scheduleRule(rule: SyncRule) {
    const recurrence = this.createSyncRuleRecurrence(rule);
    const found = this.scheduled.find(
      (scheduled) => scheduled.ruleId === rule.id
    );

    // Reschedule if found
    if (found) {
      console.log(
        `Rescheduling ${rule.name} for ${recurrence.nextInvocationDate(
          new Date()
        )}`
      );

      found.job.reschedule(recurrence);

      return this.updateSyncState(rule, {
        scheduled: true,
        running: false,
        nextScheduledRun: this.#getNextInvocation(found.job),
      });
    }

    console.log(
      `Scheduling ${rule.name} for ${recurrence.nextInvocationDate(new Date())}`
    );

    const job = schedule.scheduleJob(recurrence, async () => {
      console.log(`Running ${rule.name} rule..`);
      const state = this.updateSyncState(rule, {
        running: true,
      });
      const response = await this.run(rule);
      const logs = state.logs || [];

      if ('status' in response) {
        logs.unshift({ message: response.status, loggedAt: new Date() });
      } else {
        logs.unshift({
          message: response.errors.map((err) => err.message).join(', '),
          loggedAt: new Date(),
        });
      }

      this.updateSyncState(rule, {
        running: false,
        nextScheduledRun: this.#getNextInvocation(job),
        logs: logs.slice(0, 5),
      });
      console.log(`Finished running ${rule.name} rule at ${new Date()}.`);
    });

    this.scheduled.push({
      ruleId: rule.id,
      job,
    });

    return this.updateSyncState(rule, {
      scheduled: true,
      running: false,
      nextScheduledRun: this.#getNextInvocation(job),
    });
  }

  cancelScheduledRule(rule: SyncRule) {
    const scheduled = this.scheduled.find((item) => item.ruleId === rule.id);

    if (scheduled) {
      scheduled.job.cancel();
      this.updateSyncState(rule, {
        scheduled: false,
        running: false,
        nextScheduledRun: undefined,
      });
      this.scheduled = this.scheduled.filter((item) => item.ruleId !== rule.id);
      console.log(`Job cancelled for rule ${rule.name}.`);
    }
  }

  createSyncRuleRecurrence(rule: SyncRule) {
    const scheduleRule = new RecurrenceRule();
    const randomQuarter = Math.floor(Math.random() * 4) + 1;
    const minutes = randomQuarter * 15;

    if (rule.schedule?.frequency === 'daily') {
      scheduleRule.dayOfWeek = [new Range(0, 6)];
      // scheduleRule.hour = rule.schedule?.hour;
      // scheduleRule.minute = randomQuarter === 4 ? minutes - 5 : minutes;
      // DEBUG
      scheduleRule.hour = 17;
      scheduleRule.minute = 13;
    }

    return scheduleRule;
  }

  schedule(
    rule: string | RecurrenceRule,
    run: (done: () => { nextRunDate: Date }) => void
  ) {
    if (this.job) {
      console.log('rescheduling...');
      this.store.set('scheduleRule', rule);

      this.job.reschedule(rule);
      console.log(`Next run at ${this.job.nextInvocation()}`);
      return;
    }

    console.log('scheduling...');

    this.store.set('scheduleRule', rule);
    this.store.set('scheduleStarted', true);

    this.job = schedule.scheduleJob(rule, () => {
      this.store.set('scheduleRunning', true);
      // worker.postMessage({
      //   event: 'handle-action',
      //   data: currentConfig.UploadActions[0],
      // });
      run(() => {
        if (this.store.get('scheduleStarted')) {
          this.store.set('scheduleRunning', false);
        }
        let nextRunDate = this.job.nextInvocation();
        console.log(`done. Next run ${nextRunDate}`);

        return { nextRunDate };
      });
    });

    console.log(`Will run at ${this.job.nextInvocation()}`);
  }

  cancel() {
    if (!this.job) {
      return;
    }

    this.job.cancel();
    this.job = undefined;
  }

  get isScheduled() {
    return !!this.job;
  }

  get nextRunDate() {
    if (!this.job) {
      return;
    }

    // Actually returns a luxon date
    let result = this.job.nextInvocation();

    return result && (result as any).toDate();
  }

  #getNextInvocation(job: schedule.Job) {
    if (!job) {
      return;
    }

    // Actually returns a luxon date
    let result = job.nextInvocation();

    return result && (result as any).toDate();
  }
}
