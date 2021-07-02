import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked, cached } from '@glimmer/tracking';
import { Dataset, TableMapping } from 'mapgeo';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import { Model } from './route';
import { getAllMappings } from 'mapgeo-sync/utils/dataset-mapping';

interface RuleInput {
  dataset: Dataset;
  mapping: TableMapping;
}

export default class Index extends Controller {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;

  declare model: Model;
  @tracked dataset?: Dataset;

  @cached
  get mappings() {
    return this.dataset ? getAllMappings(this.dataset) : [];
  }

  @action
  async createRule(ruleInput: RuleInput) {
    const rules = await this.electronStore.addSyncRule({
      datasetId: ruleInput.dataset.id,
      mappingId: ruleInput.mapping.pk,
    });
    this.model.syncRules = rules;
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
