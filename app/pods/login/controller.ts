import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import RouterService from '@ember/routing/router-service';
import { NotificationsService } from '@frontile/notifications';
import { LoginData } from 'mapgeo-sync-config';
import Session from 'mapgeo-sync/services/session';
// Node modules
const { ipcRenderer } = requireNode('electron');

export default class Login extends Controller {
  @service('router') declare router: RouterService;
  @service('notifications') declare notifications: NotificationsService;
  @service('session') declare session: Session;

  @action
  async login(data: LoginData) {
    try {
      const isAuthenticated = await ipcRenderer.invoke('login', { ...data });

      this.session.isAuthenticated = isAuthenticated;
      this.router.transitionTo('index');
    } catch (e) {
      console.log(e);
      this.notifications.add(`Login failed. ${e}`, { appearance: 'warning' });
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    login: Login;
  }
}
