import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { Source, SyncRule } from 'mapgeo-sync-config';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';

interface RuleEditModalArgs {
  isOpen: boolean;
  rule: SyncRule;
  sources: Source[];
  onClose: () => void;
  onSubmit: (rules: SyncRule[]) => void;
  onDelete: (rules: SyncRule[]) => void;
}

export default class RuleEditModal extends Component<RuleEditModalArgs> {
  @service('platform') declare platform: Platform;

  get source() {
    return this.args.sources.find(
      (source) => source.id === this.args.rule.sourceId
    );
  }

  @task
  async updateRule(rule: SyncRule) {
    const rules = await this.platform.updateSyncRule(rule);
    this.args.onSubmit(rules);
  }

  @task
  async deleteRule() {
    const rules = await this.platform.removeSyncRule(this.args.rule);

    this.args.onDelete(rules);
    this.args.onClose();
  }

  @task
  async startSchedule() {
    const result = await this.platform.startSyncRuleSchedule(this.args.rule);

    return result;
  }
}
