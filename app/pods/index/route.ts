import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import { SyncConfig } from 'mapgeo-sync-config';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import Transition from '@ember/routing/-private/transition';

export interface Model {
  config: SyncConfig;
}

export default class Index extends Route {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('router') declare router: RouterService;

  beforeModel(transition: Transition) {
    if (!this.electronStore.getValue('config')) {
      transition.abort();
      return this.router.transitionTo('setup');
    }

    return;
  }

  model(): Model {
    return {
      config: this.electronStore.getValue('config'),
    };
  }
}
