import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { v4 } from 'uuid';
import { DbType, Source } from 'mapgeo-sync-config';
import ElectronStore from 'mapgeo-sync/services/electron-store';

const databaseTypes: DbType[] = ['pg', 'oracle', 'mysql', 'mssql'];
interface SourceCreateModalArgs {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sources: Source[]) => void;
  sources: Source[];
}

export default class SourceCreateModal extends Component<SourceCreateModalArgs> {
  @service('electron-store') declare electronStore: ElectronStore;

  databaseTypes = databaseTypes;

  @tracked isAddSourceVisible = false;

  @action
  async createSource(sourceInput: Source) {
    const sources = await this.electronStore.addSource({
      ...sourceInput,
      id: v4(),
    });

    this.isAddSourceVisible = false;
    this.args.onSubmit(sources);
  }
}
