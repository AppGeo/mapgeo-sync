import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class Session extends Service {
  @tracked isAuthenticated = false;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    session: Session;
  }
}
