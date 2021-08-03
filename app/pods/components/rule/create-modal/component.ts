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
import {
  ScheduleFrequency,
  Source,
  SourceConfig,
  SyncRule,
} from 'mapgeo-sync-config';

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
  file?: string;
  schedule?: {
    frequency: ScheduleFrequency;
    hour: number;
  };
  sendNotificationEmail: boolean;
}

const defaultFrequency: ScheduleFrequency = 'daily';
const hours = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23,
];

export default class RuleCreateModal extends Component<RuleCreateModalArgs> {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;

  @tracked dataset?: Dataset;
  @tracked ruleInput: Partial<RuleInput> = {
    schedule: {
      hour: 1,
      frequency: defaultFrequency,
    },
  };
  frequencies: ScheduleFrequency[] = [defaultFrequency];
  hours = hours;

  @cached
  get mappings() {
    return this.dataset ? getAllMappings(this.dataset) : [];
  }

  @action
  async createRule(ruleInput: RuleInput) {
    let sourceConfig;

    if (ruleInput.source.sourceType === 'file') {
      sourceConfig = { filePath: ruleInput.file as string };
    } else if (ruleInput.source.sourceType === 'database') {
      sourceConfig = { selectStatement: ruleInput.selectStatement as string };
    }

    const rules = await this.electronStore.addSyncRule({
      name:
        ruleInput.name ||
        `${ruleInput.dataset.name} - ${ruleInput.mapping.name}`,
      datasetId: ruleInput.dataset.id,
      mappingId: ruleInput.mapping.pk,
      sourceId: ruleInput.source.id,
      schedule: ruleInput.schedule,
      sendNotificationEmail: ruleInput.sendNotificationEmail,
      sourceConfig,
      id: v4(),
    });

    this.args.onSubmit(rules);
  }

  @action
  async selectFile(sourceId: string) {
    const file = await this.electronStore.selectSourceFile(sourceId);
    return file;
  }

  @task
  async findDataset(datasetId: string) {
    const dataset = await this.platform.findDataset(datasetId);
    this.dataset = dataset;
    return dataset;
  }
}
