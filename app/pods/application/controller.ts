import Controller from '@ember/controller';
import Session from 'mapgeo-sync/services/session';
import { inject as service } from '@ember/service';
import Platform from 'mapgeo-sync/services/platform';
import { action } from '@ember/object';
import { Router } from '@ember/routing';

export default class Application extends Controller {
  @service('session') declare session: Session;
  @service('platform') declare platform: Platform;
  @service('router') declare router: Router;

  @action
  async logout() {
    await this.platform.logout();
    this.session.isAuthenticated = false;
    this.router.transitionTo('index');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    application: Application;
  }
}
