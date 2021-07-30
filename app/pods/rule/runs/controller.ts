import Controller from '@ember/controller';
import { cached } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import Platform from 'mapgeo-sync/services/platform';

export default class RuleRuns extends Controller {
  @service('platform') declare platform: Platform;

  @cached
  get state() {
    return this.platform.syncState.find(
      (state) => state.ruleId === this.model.syncRule.id
    );
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'rule/runs': RuleRuns;
  }
}
