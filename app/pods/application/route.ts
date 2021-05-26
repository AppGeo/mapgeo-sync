import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import Session from 'mapgeo-sync/services/session';

export default class Application extends Route {
  @service('router') declare router: RouterService;
  @service('session') declare session: Session;

  async beforeModel() {
    const isAuthenticated = await this.session.waitForAuthentication();
    console.log(isAuthenticated);

    if (isAuthenticated) {
      this.router.transitionTo('index');
      return;
    }

    this.router.transitionTo('setup');
    return;
  }
}
