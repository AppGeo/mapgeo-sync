import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked, cached } from '@glimmer/tracking';
import { v4 } from 'uuid';
import { Dataset, TableMapping } from 'mapgeo';
import { getAllMappings } from 'mapgeo-sync/utils/dataset-mapping';
import { ScheduleFrequency, Source, SyncRule } from 'mapgeo-sync-config';
import { helper } from '@ember/component/helper';
import { NotificationsService } from '@frontile/notifications';
import { Changeset } from 'ember-changeset';

interface Step {
  name: 'dataset' | 'mapping' | 'config' | 'schedule';
}

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
  optoutSelectStatement?: string;
  optoutFile?: string;
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
] as const;
const days = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
} as const;

type DayValue = keyof typeof days;

export default class RuleCreateModal extends Component<RuleCreateModalArgs> {
  @service('platform') declare platform: Platform;
  @service('notifications') declare notifications: NotificationsService;

  @tracked dataset?: Dataset;
  @tracked ruleInput: Partial<RuleInput> = {};
  changeset = Changeset(this.ruleInput);
  frequencies: readonly ScheduleFrequency[] = [
    defaultFrequency,
    'weekly',
  ] as const;
  hours = hours;
  days = Object.keys(days);

  dayFormat = helper(([day]: [DayValue]) => {
    return days[day];
  });

  stepAccessible = helper(([step, changeset]: [Step | string, RuleInput]) => {
    const name = typeof step === 'string' ? step : step.name;

    switch (name) {
      case 'dataset': {
        return true;
      }
      case 'mapping': {
        return Boolean(changeset.dataset);
      }
      case 'config': {
        return Boolean(changeset.source);
      }
      case 'schedule':
      case 'optouts': {
        return Boolean(changeset.selectStatement || changeset.file);
      }
      default: {
        return false;
      }
    }
  });

  @cached
  get mappings() {
    return this.dataset ? getAllMappings(this.dataset) : [];
  }

  @action
  onClose() {
    if (this.changeset.isDirty) {
      if (confirm('Are you sure you want to cancel creating this rule?')) {
        this.changeset.rollback();
        this.args.onClose();
      }
    } else {
      this.args.onClose();
    }
  }

  @action
  async createRule(ruleInput: RuleInput) {
    if (!this.stepAccessible.compute(['schedule', ruleInput])) {
      const isFile = ruleInput.source?.sourceType === 'file';
      this.notifications.add(
        `Please fill in the ${
          isFile ? 'file' : 'select statement'
        } to finish creating this rule`,
        { appearance: 'warning' }
      );
      return;
    }

    let sourceConfig;

    if (ruleInput.source.sourceType === 'file') {
      sourceConfig = { filePath: ruleInput.file as string };
    } else if (ruleInput.source.sourceType === 'database') {
      sourceConfig = { selectStatement: ruleInput.selectStatement as string };
    }

    const name =
      ruleInput.name || `${ruleInput.dataset.name} - ${ruleInput.mapping.name}`;
    let optoutRule: SyncRule | undefined;

    if (ruleInput.optoutSelectStatement || ruleInput.optoutFile) {
      let sourceConfig;

      if (ruleInput.source.sourceType === 'file') {
        sourceConfig = { filePath: ruleInput.optoutFile as string };
      } else if (ruleInput.source.sourceType === 'database') {
        sourceConfig = {
          selectStatement: ruleInput.optoutSelectStatement as string,
        };
      }

      optoutRule = {
        name: `${name} Optouts`,
        datasetId: ruleInput.dataset.id,
        mappingId: ruleInput.mapping.pk,
        sourceId: ruleInput.source.id,
        sourceConfig,
        id: v4(),
      };
    }

    const rules = await this.platform.addSyncRule({
      id: v4(),
      name,
      datasetId: ruleInput.dataset.id,
      mappingId: ruleInput.mapping.pk,
      sourceId: ruleInput.source.id,
      schedule: ruleInput.schedule,
      sendNotificationEmail: ruleInput.sendNotificationEmail,
      sourceConfig,
      optoutRule,
    });

    this.changeset.rollback();
    this.args.onSubmit(rules);
  }

  @action
  async selectFile(sourceId: string) {
    const file = await this.platform.selectSourceFile(sourceId);
    return file;
  }

  @task
  async findDataset(datasetId: string) {
    const dataset = await this.platform.findDataset(datasetId);
    this.dataset = dataset;
    return dataset;
  }
}
