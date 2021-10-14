import { helper } from '@ember/component/helper';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { Source, SyncFileConfig } from 'mapgeo-sync-config';
import Platform from 'mapgeo-sync/services/platform';
import { BufferedChangeset } from 'validated-changeset';

interface RuleFileSelectArgs {
  Form: Component;
  changeset: BufferedChangeset;
  source: Source;
}

const fileTypesNotGeoJSON: SyncFileConfig['fileType'][] = ['csv', 'json'];
const fileTypes: { [FileType in SyncFileConfig['fileType']]: string } = {
  json: '.json (Array with rows of data)',
  geojson: '.geojson (Feature Collection)',
  csv: '.csv (Usually exported from Excel or a similar tool)',
  gdb: 'File GeoDatabase (Experimental. A folder containing all the files. Unzip your zip file.)',
} as const;
const fileTypeKeys = Object.keys(fileTypes) as (keyof typeof fileTypes)[];

export default class RuleFileSelect extends Component<RuleFileSelectArgs> {
  @service('platform') declare platform: Platform;

  fileTypeKeys = fileTypeKeys;

  fileTypeFormat = helper(([type]: [SyncFileConfig['fileType']]) => {
    return fileTypes[type];
  });

  get mightNeedGeoJsonFormatting() {
    const fileType = this.args.changeset.get(
      'sourceConfig.fileType'
    ) as SyncFileConfig['fileType'];

    return fileTypesNotGeoJSON.includes(fileType);
  }

  @action
  async selectFile(sourceId: string, fileType: SyncFileConfig['fileType']) {
    const file = await this.platform.selectSourceFile(sourceId, fileType);

    this.args.changeset.set('sourceConfig.filePath', file);

    return file;
  }

  @action
  async selectFolder(sourceId: string) {
    const file = await this.platform.selectSourceFolder(sourceId);

    this.args.changeset.set('sourceConfig.filePath', file);

    return file;
  }
}
