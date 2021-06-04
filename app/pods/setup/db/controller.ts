import Controller from '@ember/controller';

export default class SetupDb extends Controller {
  // normal class body definition here
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'setup/db': SetupDb;
  }
}
