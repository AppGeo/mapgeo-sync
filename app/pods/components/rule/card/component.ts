import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked, cached } from '@glimmer/tracking';
import { Source, SyncRule } from 'mapgeo-sync-config';
import { Dataset } from 'mapgeo';
import { getAllMappings } from 'mapgeo-sync/utils/dataset-mapping';
import { taskFor } from 'ember-concurrency-ts';

interface RuleCardArgs {
  rule: SyncRule;
  sources: Source[];
  datasets: Dataset[];
  onEdit: (rule: SyncRule) => void;
}

export default class RuleCard extends Component<RuleCardArgs> {
  @service('platform') declare platform: Platform;

  @tracked declare dataset: Dataset;

  constructor(owner: unknown, args: RuleCardArgs) {
    super(owner, args);
    taskFor(this.findDataset).perform();
  }

  @cached
  get mapping() {
    const mappings = this.dataset ? getAllMappings(this.dataset) || [] : [];
    return mappings.find((mapping) => mapping.pk === this.args.rule.mappingId);
  }

  @cached
  get state() {
    return this.platform.syncState.find(
      (state) => state.ruleId === this.args.rule.id
    );
  }

  @cached
  get source() {
    const source = this.args.sources.find(
      (source) => source.id === this.args.rule.sourceId
    );
    return source;
  }

  @task
  async runRule(rule: SyncRule) {
    const result = await this.platform.runSyncRule(rule);
    return result;
  }

  @task
  async startRuleSchedule(rule: SyncRule) {
    const result = await this.platform.startSyncRuleSchedule(rule);
    return result;
  }

  @task
  async cancelRuleSchedule(rule: SyncRule) {
    const result = await this.platform.cancelSyncRuleSchedule(rule);
    return result;
  }

  @task
  async findDataset() {
    const dataset = await this.platform.findDataset(this.args.rule.datasetId);
    this.dataset = dataset;
    return dataset;
  }
}
