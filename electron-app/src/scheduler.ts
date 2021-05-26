import * as schedule from 'node-schedule';
import * as Store from 'electron-store';

export default class Scheduler {
  private store: Store;
  private job: schedule.Job;

  constructor({ store }: { store: Store<any> }) {
    this.store = store;
  }

  schedule(rule: string, run: (done: () => { nextRunDate: Date }) => void) {
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
}
