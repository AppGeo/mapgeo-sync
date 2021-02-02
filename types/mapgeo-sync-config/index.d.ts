export type Action = QueryAction | OptoutAction;

export type OptoutAction = {
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

export interface QueryOutput {
  fieldname: string;
  table: string;
  typeId: string;
  rows: any[];
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
