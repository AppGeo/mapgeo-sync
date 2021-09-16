import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import Session from 'mapgeo-sync/services/session';
import Platform from 'mapgeo-sync/services/platform';

export default class Application extends Route {
  @service('router') declare router: RouterService;
  @service('session') declare session: Session;
  @service('platform') declare platform: Platform;

  beforeModel() {
    this.session.setup();
  }

  async model() {
    await this.platform.loadClient();
  }
}
