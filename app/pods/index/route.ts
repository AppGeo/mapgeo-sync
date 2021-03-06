import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import { Source, SyncConfig, SyncRule } from 'mapgeo-sync-config';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import { hash } from 'rsvp';
import Session from 'mapgeo-sync/services/session';
import Platform from 'mapgeo-sync/services/platform';

export interface Model {
  config: SyncConfig;
  syncRules: SyncRule[];
  sources: Source[];
}

export default class Index extends Route {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;
  @service('router') declare router: RouterService;
  @service('session') declare session: Session;

  model(): Promise<Model> {
    return hash({
      community: this.platform.fetchCommunity(),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config: this.electronStore.getValue('config') as Promise<SyncConfig>,
      syncRules: this.electronStore.findSyncRules(),
      sources: this.electronStore.findSources(),
    });
  }
}
