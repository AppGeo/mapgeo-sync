export type Action = QueryAction | OptoutAction;

export type OptoutAction = {
  DatasetId: string;

  /** New field, since connection string could be a number of databases */
  DbType: 'pg';
  ConnectionString: string;
  /**  if QueryType is 'file' then query is the path to the SQL file. If QueryType is 'sql' then query is the actual SQL query */
  QueryType: 'sql' | 'file';
  Query: string;
};

export type QueryAction = {
  DatasetId: string;

  ActionType: 'query';
  /** New field, since connection string could be a number of databases */
  DbType: 'pg';
  ConnectionString: string;

  /**  if QueryType is 'file' then query is the path to the SQL file. If QueryType is 'sql' then query is the actual SQL query */
  QueryType: 'sql' | 'file';
  Query: string;

  FileName: string;
  UploadType: 'property' | 'parcel' | 'intersection' | 'layer' | 'mapping';

  ForceInsertGeometry: boolean;
  FormatAsGeoJson: boolean;
};

export interface UploadMetadata {
  fieldname: string;
  table: string;
  typeId: string;
}

export interface SyncConfig {
  MapGeoOptions: {
    Host: string;
    Email: string;
    Password: string;
    NotificationEmail: string;
    UpdateDate: boolean;
    UpdateIntersections: boolean;
  };
  UploadActions: QueryAction[];
  OptOutActions: OptoutAction[];
}

export interface SetupData {
  mapgeoUrl: string;
}
export interface LoginData {
  email: string;
  password: string;
}

export interface SyncDbConfig {
  selectStatement: string;
}

export interface SyncFileConfig {
  filePath: string;
}

export interface RuleBundle {
  rule: SyncRule;
  source: Source;
}

export type ScheduleFrequency = 'daily';

export type SourceConfig = SyncDbConfig | SyncFileConfig;

export interface SyncRule {
  id: string;
  name: string;
  datasetId: string;
  sourceId: string;
  mappingId: string;
  sendNotificationEmail: boolean;
  schedule?: {
    frequency: ScheduleFrequency;
    hour: number;
  };
  sourceConfig?: SourceConfig;
}

export interface RuleLogItem {
  ok: boolean;
  runMode: 'scheduled' | 'manual';
  startedAt: Date;
  endedAt: Date;
  errors: { message: string }[];
  numItems?: number;
  intersection?: {
    ok: boolean;
    skipped: boolean;
  };
}

export interface SyncState {
  ruleId: string;
  scheduled?: boolean;
  running?: boolean;
  nextScheduledRun?: Date;
  logs?: RuleLogItem[];
}

export type DbType = 'pg' | 'oracle' | 'mysql' | 'mssql';

export interface SourceDbType {
  id: string;
  name: string;
  sourceType: 'database';
  databaseType: DbType;
  connectionString: string;
}

export interface SourceFileType {
  id: string;
  name: string;
  sourceType: 'file';
  folder: string;
}

export type Source = SourceDbType | SourceFileType;
