import { Dataset } from 'mapgeo';

export type PrimaryType = 'data' | 'geometry' | 'intersection';

export const primaryTypes: [PrimaryType, PrimaryType, PrimaryType] = [
  'data',
  'geometry',
  'intersection',
];

export const getAllMappings = (dataset: Dataset) => {
  return [
    dataset.dataMapping,
    dataset.geometryMapping,
    dataset.intersectionMapping,
    ...dataset.tableMappings,
  ];
};
