import EmberRouter from '@ember/routing/router';
import config from 'mapgeo-sync/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('setup', function () {
    this.route('db');
  });
  this.route('login');

  this.route('error');
  this.route('loading');
});
