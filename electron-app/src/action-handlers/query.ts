import * as knex from 'knex';
import { QueryAction, QueryOutput } from 'mapgeo-sync-config';

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
    client: action.DbType,
    connection: action.ConnectionString,
  });
  let result = await db.raw(action.Query);
  console.log(result);
  return result?.rows;
}
