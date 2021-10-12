import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import Session from 'mapgeo-sync/services/session';
import Platform from 'mapgeo-sync/services/platform';
import { CommunityConfig } from 'mapgeo';
import { hash } from 'rsvp';

interface Model {
  config: CommunityConfig;
}

export default class Application extends Route {
  @service('router') declare router: RouterService;
  @service('session') declare session: Session;
  @service('platform') declare platform: Platform;

  beforeModel() {
    this.session.setup();
  }

  async model(): Promise<Model> {
    await this.platform.loadClient();

    return hash({
      config: this.platform.getValue('mapgeo.config'),
      host: this.platform.getValue('mapgeo.host'),
    });
  }
}
