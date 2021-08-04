import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import Session from 'mapgeo-sync/services/session';
import Platform from 'mapgeo-sync/services/platform';
import { Model } from '../route';

export default class RuleRuns extends Route {
  @service('platform') declare platform: Platform;
  @service('router') declare router: RouterService;
  @service('session') declare session: Session;

  async model(): Promise<Model> {
    const model = this.modelFor('rule') as Model;
    return model;
  }
}
