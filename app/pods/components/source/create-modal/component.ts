import { helper } from '@ember/component/helper';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { NotificationsService } from '@frontile/notifications';
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { DbType, Source } from 'mapgeo-sync-config';
import Platform from 'mapgeo-sync/services/platform';
import { trackedReset } from 'tracked-toolbox';
import { v4 } from 'uuid';
import { BufferedChangeset } from 'validated-changeset';
import { Changeset } from 'ember-changeset';
import { cached } from '@glimmer/tracking';

const databaseTypes: DbType[] = ['pg', 'mssql', 'mysql', 'oracle'];
const databaseMap: { [DbKey in DbType]: string } = {
  pg: 'Postgres',
  oracle: 'Oracle',
  mssql: 'SQL Server',
  mysql: 'MySQL',
} as const;

interface SourceCreateModalArgs {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sources: Source[]) => void;
  onDelete: (sources: Source[]) => void;
  sources: Source[];
}

export default class SourceCreateModal extends Component<SourceCreateModalArgs> {
  @service('platform') declare platform: Platform;
  @service('notifications') declare notifications: NotificationsService;

  databaseTypes = databaseTypes;
  databaseName = helper(([type]: [DbType]) => {
    return databaseMap[type];
  });

  @trackedReset<boolean, SourceCreateModal>({
    memo: 'args.sources.length',
    update() {
      return this.args.sources.length === 0;
    },
  })
  isAddSourceVisible = false;

  @cached
  get changeset() {
    return Changeset({});
  }

  @task
  async testConnection(changeset: BufferedChangeset) {
    return this.platform.testDbConnection(changeset.pendingData as Source);
  }

  @action
  confirmCloseIfDirty() {
    if (this.changeset.isDirty) {
      if (confirm('Are you sure you want to cancel creating this source?')) {
        this.changeset.rollback();
        this.args.onClose();
      }
    } else {
      this.args.onClose();
    }
  }

  @action
  async createSource(sourceInput: Source) {
    const sources = await this.platform.addSource({
      ...sourceInput,
      id: v4(),
    });

    this.isAddSourceVisible = false;
    this.notifications.add(
      'Source successfully created, you can now use it to create a rule',
      { appearance: 'success' }
    );
    this.args.onSubmit(sources);
  }

  @action
  async removeSource(source: Source) {
    const sources = await this.platform.removeSource(source);
    this.notifications.add('Source successfully removed', {
      appearance: 'success',
    });
    this.args.onDelete(sources);
  }

  @action
  async selectFolder() {
    const folder = await this.platform.selectSourceBaseFolder();
    return folder;
  }
}
