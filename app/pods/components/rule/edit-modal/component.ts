import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { Source, SyncRule } from 'mapgeo-sync-config';
import Platform from 'mapgeo-sync/services/platform';
import { BufferedChangeset } from 'validated-changeset';
import { Changeset } from 'ember-changeset';
import { cached } from '@glimmer/tracking';

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

  @cached
  get changeset() {
    return Changeset(this.args.rule);
  }

  get source() {
    return this.args.sources.find(
      (source) => source.id === this.changeset.sourceId
    );
  }

  @action
  changeSource(changeset: BufferedChangeset, selected: Source) {
    changeset.set('sourceId', selected.id);
    changeset.set('sourceConfig', {});
  }

  @task
  async updateRule(rule: SyncRule) {
    const rules = await this.platform.updateSyncRule(rule);
    this.args.onSubmit(rules);
  }

  @task
  async deleteRule() {
    if (window.confirm('Are you sure?')) {
      const rules = await this.platform.removeSyncRule(this.args.rule);

      this.args.onDelete(rules);
      this.args.onClose();
    }
  }

  @task
  async startSchedule() {
    const result = await this.platform.startSyncRuleSchedule(this.args.rule);

    return result;
  }
}
