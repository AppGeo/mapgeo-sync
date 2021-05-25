import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import { SyncConfig } from 'mapgeo-sync-config';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import Transition from '@ember/routing/-private/transition';
import { hash } from 'rsvp';

export interface Model {
  config: SyncConfig;
  configUpdated?: Date;
  scheduleRule?: string;
}

export default class Index extends Route {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('router') declare router: RouterService;

  config?: SyncConfig;

  async beforeModel(transition: Transition) {
    const config = (await this.electronStore.getValue('config')) as SyncConfig;
    this.config = config;

    if (!this.config) {
      transition.abort();
      return this.router.transitionTo('setup');
    }

    return;
  }

  model(): Promise<Model> {
    return hash({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config: this.config!,
      configUpdated: this.electronStore.getValue(
        'configUpdated'
      ) as Promise<Date>,
      scheduleRule: this.electronStore.getValue(
        'scheduleRule'
      ) as Promise<string>,
    });
  }
}
