import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import Platform from 'mapgeo-sync/services/platform';
import { tracked } from '@glimmer/tracking';
import { localCopy } from 'tracked-toolbox';
import { Model } from './route';
import { Source, SyncRule } from 'mapgeo-sync-config';

export default class Index extends Controller {
  @service('platform') declare platform: Platform;

  declare model: Model;

  @localCopy('model.syncRules')
  declare syncRules: SyncRule[];
  @localCopy('model.sources')
  declare sources: Source[];

  @tracked isCreateRuleOpen = false;
  @tracked isEditRuleOpen = false;
  @tracked isSyncSourceOpen = false;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    index: Index;
  }
}
