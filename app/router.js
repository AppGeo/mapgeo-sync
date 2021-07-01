import EmberRouter from '@ember/routing/router';
import config from 'mapgeo-sync/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('setup', function() {
    this.route('db');
  });
  this.route('login');
  this.route('dataset', { path: 'dataset/:datasetId' }, function () {
    this.route('mapping', { path: 'mapping/:mappingId' }, function () {
      this.route('setup');
    });
  });
  this.route('error');
  this.route('loading');

  this.route('rules', function() {
    this.route('create');
  });
});
