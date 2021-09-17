import { helper } from '@ember/component/helper';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { SyncFileConfig } from 'mapgeo-sync-config';
import Platform from 'mapgeo-sync/services/platform';
import { BufferedChangeset } from 'validated-changeset';

interface RuleFileSelectArgs {
  Form: unknown;
  changeset: BufferedChangeset;
}

const fileTypes: { [FileType in SyncFileConfig['fileType']]: string } = {
  json: '.json (Array With Rows)',
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

  @action
  async selectFile(sourceId: string) {
    const file = await this.platform.selectSourceFile(sourceId);
    return file;
  }

  @action
  async selectFolder(sourceId: string) {
    const file = await this.platform.selectSourceFolder(sourceId);
    return file;
  }
}
