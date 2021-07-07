import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked, cached } from '@glimmer/tracking';
import { v4 } from 'uuid';
import { Dataset, TableMapping } from 'mapgeo';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import { Model } from './route';
import { getAllMappings } from 'mapgeo-sync/utils/dataset-mapping';
import { DbType, Source, SyncRule } from 'mapgeo-sync-config';

const databaseTypes: DbType[] = ['pg', 'oracle', 'mysql', 'mssql'];

export default class Index extends Controller {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;

  databaseTypes = databaseTypes;
  declare model: Model;

  @tracked syncRules?: SyncRule[];
  @tracked isAddSourceVisible = false;
  @tracked isCreateRuleOpen = false;
  @tracked isSyncSourceOpen = false;

  @action
  async createSource(sourceInput: Source) {
    const sources = await this.electronStore.addSource({
      ...sourceInput,
      id: v4(),
    });
    this.model.sources = sources;
    this.isSyncSourceOpen = false;
    this.isAddSourceVisible = false;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    index: Index;
  }
}
