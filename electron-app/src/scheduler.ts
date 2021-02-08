import * as schedule from 'node-schedule';
import * as Store from 'electron-store';

let job: schedule.Job;

export default class Scheduler {
  store: Store;

  constructor({ store }: { store: Store }) {
    this.store = store;
  }

  schedule(rule: string, run: (done: () => void) => void) {
    if (job) {
      return job.reschedule(rule);
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
        console.log('done');
      });
    });
  }
}
