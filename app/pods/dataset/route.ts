import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import Platform from 'mapgeo-sync/services/platform';

export interface DatasetParams {
  datasetId: string;
}

export default class Dataset extends Route {
  @service('platform') declare platform: Platform;

  model({ datasetId }: DatasetParams) {
    return this.platform.findDataset(datasetId);
  }
}
