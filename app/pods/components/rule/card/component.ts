import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Platform from 'mapgeo-sync/services/platform';
import { tracked, cached } from '@glimmer/tracking';
import { SyncRule } from 'mapgeo-sync-config';

interface RuleCardArgs {
  rule: SyncRule;
}

export default class RuleCard extends Component<RuleCardArgs> {
  @service('platform') declare platform: Platform;

  @task
  async runRule(rule: SyncRule) {
    const result = await this.platform.runSyncRule(rule);
    return result;
  }
}
