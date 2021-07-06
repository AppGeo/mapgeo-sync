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

interface RuleInput {
  dataset: Dataset;
  mapping: TableMapping;
  source: Source;
  selectStatement?: string;
}

export default class Index extends Controller {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;

  databaseTypes = databaseTypes;
  declare model: Model;

  @tracked syncRules?: SyncRule[];
  @tracked isAddSourceVisible = false;
  @tracked isCreateRuleOpen = false;
  @tracked isSyncSourceOpen = false;
  @tracked dataset?: Dataset;
  @tracked ruleInput: Partial<RuleInput> = {};

  @cached
  get mappings() {
    return this.dataset ? getAllMappings(this.dataset) : [];
  }

  @action
  async createRule(ruleInput: RuleInput) {
    const rules = await this.electronStore.addSyncRule({
      datasetId: ruleInput.dataset.id,
      mappingId: ruleInput.mapping.pk,
      sourceId: ruleInput.source.id,
      sourceConfig: {
        selectStatement: ruleInput.selectStatement as string,
      },
      id: v4(),
    });
    this.syncRules = rules;
    this.isCreateRuleOpen = false;
  }

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

  @task
  async findDataset(datasetId: string) {
    const dataset = await this.platform.findDataset(datasetId);
    this.dataset = dataset;
    return dataset;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    index: Index;
  }
}
