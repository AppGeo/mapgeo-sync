import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import RouterService from '@ember/routing/router-service';
import { NotificationsService } from '@frontile/notifications';
import type { IpcRendererEvent } from 'electron/renderer';
import { LoginData } from 'mapgeo-sync-config';
// Node modules
const { ipcRenderer } = requireNode('electron');

export default class Login extends Controller {
  @service('router') declare router: RouterService;
  @service('notifications') declare notifications: NotificationsService;

  @action
  async login(data: LoginData) {
    try {
      const isAuthenticated = await ipcRenderer.invoke('login', data);
      if (isAuthenticated) return alert('logged in');
      console.log(isAuthenticated);
    } catch (e) {
      console.log(e);
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    login: Login;
  }
}
