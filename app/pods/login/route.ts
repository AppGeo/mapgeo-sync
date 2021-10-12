import Route from '@ember/routing/route';
import RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import { CommunityConfig } from 'mapgeo';
import Platform from 'mapgeo-sync/services/platform';

export default class Login extends Route {
  @service('platform') declare platform: Platform;
  @service('router') declare router: RouterService;

  async model() {
    const config = (await this.platform.getValue(
      'mapgeo.config'
    )) as CommunityConfig;

    return config;
  }

  afterModel(config?: CommunityConfig) {
    if (!config) {
      return this.router.transitionTo('setup');
    }

    return;
  }
}
