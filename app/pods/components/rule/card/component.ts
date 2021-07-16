import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked, cached } from '@glimmer/tracking';
import { Source, SyncRule } from 'mapgeo-sync-config';

interface RuleCardArgs {
  rule: SyncRule;
  sources: Source[];
  onEdit: (rule: SyncRule) => void;
}

export default class RuleCard extends Component<RuleCardArgs> {
  @service('platform') declare platform: Platform;

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
}
