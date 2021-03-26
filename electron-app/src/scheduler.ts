import * as schedule from 'node-schedule';
import * as Store from 'electron-store';

let job: schedule.Job;

export default class Scheduler {
  store: Store;

  constructor({ store }: { store: Store }) {
    this.store = store;
  }

  schedule(rule: string, run: (done: () => { nextRunDate: Date }) => void) {
    if (job) {
      console.log('rescheduling...');
      job.reschedule(rule);
      console.log(`Next run at ${job.nextInvocation()}`);
      return;
    }

    console.log('scheduling...');
    this.store.set('scheduleRule', rule);
    this.store.set('scheduleStarted', true);

    job = schedule.scheduleJob(rule, () => {
      this.store.set('scheduleRunning', true);
      // worker.postMessage({
      //   event: 'handle-action',
      //   data: currentConfig.UploadActions[0],
      // });
      run(() => {
        if (this.store.get('scheduleStarted')) {
          this.store.set('scheduleRunning', false);
        }
        let nextRunDate = job.nextInvocation();
        console.log(`done. Next run ${nextRunDate}`);

        return { nextRunDate };
      });
    });

    console.log(`Will run at ${job.nextInvocation()}`);
  }
}
