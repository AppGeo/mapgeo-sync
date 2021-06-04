import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { Dataset, TableMapping } from 'mapgeo';
import Platform from 'mapgeo-sync/services/platform';

interface Params {
  mappingId: 'data';
}

interface Model {}

type PrimaryType = 'data' | 'geometry' | 'intersection';
const primaryTypes: [PrimaryType, PrimaryType, PrimaryType] = [
  'data',
  'geometry',
  'intersection',
];

export default class DatasetMapping extends Route<Model> {
  @service('platform') declare platform: Platform;

  model({ mappingId }: Params) {
    const dataset = this.modelFor('dataset') as Dataset;
    let mapping;

    if (primaryTypes.includes(mappingId)) {
      switch (mappingId as PrimaryType) {
        case 'data': {
          mapping = dataset.dataMapping;
          break;
        }
        case 'geometry': {
          mapping = dataset.geometryMapping;
          break;
        }
        case 'intersection': {
          mapping = dataset.intersectionMapping;
          break;
        }
      }
    } else {
      mapping = dataset.tableMappings.find(
        (mapping: TableMapping) => mapping.pk === mappingId
      );
    }

    return {
      dataset,
      mapping,
    };
  }
}
