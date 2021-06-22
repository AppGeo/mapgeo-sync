import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import RouterService from '@ember/routing/router-service';
import { NotificationsService } from '@frontile/notifications';
import { SetupData } from 'mapgeo-sync-config';
import Platform from 'mapgeo-sync/services/platform';

export default class SetupIndex extends Controller {
  @service('router') declare router: RouterService;
  @service('notifications') declare notifications: NotificationsService;
  @service('platform') declare platform: Platform;

  @action
  async checkMapgeo({ mapgeoUrl }: SetupData) {
    try {
      const isOk = await this.platform.checkMapGeo(mapgeoUrl);

      if (isOk) {
        await this.router.transitionTo('setup.db');
      } else {
        this.notifications.add('Looks like something is up with that URL', {
          appearance: 'warning',
        });
      }
    } catch (e) {
      this.notifications.add(
        `The entered URL was not found: ${e.message ?? e}`,
        { appearance: 'warning' }
      );
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'setup/index': SetupIndex;
  }
}
