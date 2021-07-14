import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import { SyncRule } from 'mapgeo-sync-config';
import { task } from 'ember-concurrency';

interface RuleEditModalArgs {
  isOpen: boolean;
  rule: SyncRule;
  onClose: () => void;
  onSubmit: (rule: SyncRule) => void;
  onDelete: (rules: SyncRule[]) => void;
}

export default class RuleEditModal extends Component<RuleEditModalArgs> {
  @service('electron-store') declare electronStore: ElectronStore;

  @task
  async deleteRule() {
    const rules = await this.electronStore.removeSyncRule(this.args.rule);

    this.args.onDelete(rules);
    this.args.onClose();
  }
}
