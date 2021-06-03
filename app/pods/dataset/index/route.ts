import Route from '@ember/routing/route';

export default class DatasetIndex extends Route {
  model() {
    return this.modelFor('dataset');
  }
}
