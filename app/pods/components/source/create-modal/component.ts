import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { v4 } from 'uuid';
import { DbType, Source } from 'mapgeo-sync-config';
import Platform from 'mapgeo-sync/services/platform';

const databaseTypes: DbType[] = ['pg', 'oracle', 'mysql', 'mssql'];
interface SourceCreateModalArgs {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sources: Source[]) => void;
  sources: Source[];
}

export default class SourceCreateModal extends Component<SourceCreateModalArgs> {
  @service('platform') declare platform: Platform;

  databaseTypes = databaseTypes;

  @tracked isAddSourceVisible = false;

  @action
  async createSource(sourceInput: Source) {
    const sources = await this.platform.addSource({
      ...sourceInput,
      id: v4(),
    });

    this.isAddSourceVisible = false;
    this.args.onSubmit(sources);
  }

  @action
  async selectFolder() {
    const folder = await this.platform.selectSourceFolder();
    return folder;
  }
}
