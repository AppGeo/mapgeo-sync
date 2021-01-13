import * as knex from 'knex';

export interface QueryAction {
  ActionType: 'query';
  ConnectionString: string;

  // if QueryType is 'file' then query is the path to the SQL file. If QueryType is 'file' then query is the actual SQL query
  QueryType: 'sql' | 'file';
  Query: string;

  FileName: string;
  UploadType: 'property' | 'parcel' | 'intersection' | 'layer' | 'mapping';

  ForceInsertGeometry: boolean;
  FormatAsGeoJson: boolean;
}

export interface QueryOutput {
  fieldname: string;
  table: string;
  typeId: string;
}

export default async function handle(community: string, action: QueryAction) {
  if (!action.FileName) {
    throw new Error('FileName cannot be empty');
  }

  const FileName = `${community}_${action.FileName}`;
  console.log(`Uploading query file ${FileName} to cloud`);

  const output = await upload({ ...action, FileName });
  output.fieldname = action.UploadType;
  output.table = FileName.slice(0, FileName.lastIndexOf('.'));
  output.typeId = action.FileName.slice(0, action.FileName.lastIndexOf('.'));

  return output;
}

async function upload(action: QueryAction): Promise<QueryOutput> {
  const db = knex({
    client: 'pg',
    connection: action.ConnectionString,
  });
  let result = await db.raw(action.Query);
  console.log(result);
  return result;
}
