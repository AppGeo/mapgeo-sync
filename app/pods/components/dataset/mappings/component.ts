import Component from '@glimmer/component';

interface DatasetMappingsArgs {
  dataset: any;
}

export default class DatasetMappings extends Component<DatasetMappingsArgs> {
  get primary() {
    const dataset = this.args.dataset;
    const isMulti = dataset.dataMapping.multiTable;

    if (isMulti) {
      return [
        dataset.dataMapping,
        dataset.intersectionMapping,
        dataset.geometryMapping,
      ];
    }
    return [dataset.dataMapping];
  }
}
