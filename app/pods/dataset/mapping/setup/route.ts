import Route from '@ember/routing/route';

export default class DatasetMappingSetup extends Route {
  model() {
    return this.modelFor('dataset.mapping');
  }
}
