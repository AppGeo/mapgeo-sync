import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import Session from 'mapgeo-sync/services/session';
import Platform from 'mapgeo-sync/services/platform';
import { next } from '@ember/runloop';

export default class Application extends Route {
  @service('router') declare router: RouterService;
  @service('session') declare session: Session;
  @service('platform') declare platform: Platform;

  async beforeModel() {
    await this.session.restore();
  }

  afterModel() {
    if (!this.session.isAuthenticated) {
      next(() => {
        this.router.transitionTo('setup');
      });
    }
  }
}
