import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { v4 } from 'uuid';
import { DbType, Source } from 'mapgeo-sync-config';
import Platform from 'mapgeo-sync/services/platform';
import { NotificationsService } from '@frontile/notifications';
import { task } from 'ember-concurrency';
import { helper } from '@ember/component/helper';

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

  @tracked isAddSourceVisible = false;

  @task
  async testConnection(changeset: any) {
    return this.platform.testDbConnection(changeset.pendingData as Source);
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
