import Service from '@ember/service';

export default class Platform extends Service {
  // normal class body definition here
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    platform: Platform;
  }
}
