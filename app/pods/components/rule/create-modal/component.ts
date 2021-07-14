import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked, cached } from '@glimmer/tracking';
import { v4 } from 'uuid';
import { Dataset, TableMapping } from 'mapgeo';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import { getAllMappings } from 'mapgeo-sync/utils/dataset-mapping';
import { Source, SyncRule } from 'mapgeo-sync-config';

interface RuleCreateModalArgs {
  isOpen: boolean;
  datasets: Dataset[];
  sources: Source[];
  onClose: () => void;
  onSubmit: (rules: SyncRule[]) => void;
}

interface RuleInput {
  name?: string;
  dataset: Dataset;
  mapping: TableMapping;
  source: Source;
  selectStatement?: string;
  scheduleRule?: string;
}

export default class RuleCreateModal extends Component<RuleCreateModalArgs> {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;

  @tracked dataset?: Dataset;
  @tracked ruleInput: Partial<RuleInput> = {};

  @cached
  get mappings() {
    return this.dataset ? getAllMappings(this.dataset) : [];
  }

  @action
  async createRule(ruleInput: RuleInput) {
    const rules = await this.electronStore.addSyncRule({
      name:
        ruleInput.name ||
        `${ruleInput.dataset.name} - ${ruleInput.mapping.name}`,
      datasetId: ruleInput.dataset.id,
      mappingId: ruleInput.mapping.pk,
      sourceId: ruleInput.source.id,
      scheduleRule: ruleInput.scheduleRule,
      sourceConfig: {
        selectStatement: ruleInput.selectStatement as string,
      },
      id: v4(),
    });

    this.args.onSubmit(rules);
  }

  @task
  async findDataset(datasetId: string) {
    const dataset = await this.platform.findDataset(datasetId);
    this.dataset = dataset;
    return dataset;
  }
}
