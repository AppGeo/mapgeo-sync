import * as knex from 'knex';
import { QueryAction, QueryOutput } from 'mapgeo-sync-config';

// TODO: update config instead?
const typeConversion = new Map([
  ['intersection', 'intersection'],
  ['parcel', 'geometry'],
  ['property', 'data'],
]);

export default async function handle(community: string, action: QueryAction) {
  if (!action.FileName) {
    throw new Error('FileName cannot be empty');
  }

  const FileName = `${community}_${action.FileName}`;
  console.log(`Uploading query file ${FileName} to cloud`);

  const rows = await upload({ ...action, FileName });
  const res = {
    rows,
    fieldname: typeConversion.get(action.UploadType),
    table: FileName.slice(0, FileName.lastIndexOf('.')),
    typeId: action.FileName.slice(0, action.FileName.lastIndexOf('.')),
  };

  return res;
}

async function upload(action: QueryAction): Promise<QueryOutput> {
  const db = knex({
    client: action.DbType,
    connection: action.ConnectionString,
  });
  let result = await db.raw(action.Query);
  console.log(`found ${result?.rows?.length} items`);
  return result?.rows;
}
