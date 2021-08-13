import { Dataset } from 'mapgeo';

export type PrimaryType = 'data' | 'geometry' | 'intersection';

export const primaryTypes: [PrimaryType, PrimaryType, PrimaryType] = [
  'data',
  'geometry',
  'intersection',
];

export const getAllMappings = (dataset: Dataset) => {
  if (dataset.dataMapping.multiTable) {
    return [
      dataset.dataMapping,
      dataset.geometryMapping,
      dataset.intersectionMapping,
      ...dataset.tableMappings,
    ];
  }

  return [dataset.dataMapping, ...dataset.tableMappings];
};
