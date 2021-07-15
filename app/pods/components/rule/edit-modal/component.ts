import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import { SyncRule } from 'mapgeo-sync-config';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';

interface RuleEditModalArgs {
  isOpen: boolean;
  rule: SyncRule;
  onClose: () => void;
  onSubmit: (rule: SyncRule) => void;
  onDelete: (rules: SyncRule[]) => void;
}

export default class RuleEditModal extends Component<RuleEditModalArgs> {
  @service('electron-store') declare electronStore: ElectronStore;
  @service('platform') declare platform: Platform;

  @task
  async deleteRule() {
    const rules = await this.electronStore.removeSyncRule(this.args.rule);

    this.args.onDelete(rules);
    this.args.onClose();
  }

  @task
  async startSchedule() {
    const result = await this.platform.startSyncRuleSchedule(this.args.rule);

    return result;
  }
}
