import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked } from '@glimmer/tracking';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import { Model } from './route';
import { Source, SyncRule } from 'mapgeo-sync-config';

export default class Index extends Controller {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;

  declare model: Model;

  @tracked syncRules?: SyncRule[];
  @tracked sources?: Source[];
  @tracked isCreateRuleOpen = false;
  @tracked isSyncSourceOpen = false;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    index: Index;
  }
}
