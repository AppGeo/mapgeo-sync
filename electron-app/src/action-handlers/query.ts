import knex from 'knex';
import {
  QueryOutput,
  RuleBundle,
  SyncDbConfig,
  SyncRule,
} from 'mapgeo-sync-config';
import { store } from '../store';

// TODO: update config instead?
const typeConversion = new Map([
  ['intersection', 'intersection'],
  ['parcel', 'geometry'],
  ['property', 'data'],
]);

export default async function handle(
  community: string,
  ruleBundle: RuleBundle
) {
  const fileName = `${community}_rule_${ruleBundle.rule.id}.json`;
  console.log(`Uploading query file ${fileName} to cloud`);

  const rows = await query(ruleBundle);
  const res: QueryOutput = {
    rows,
    fieldname: typeConversion.get(ruleBundle.rule.mappingId),
    table: fileName.slice(0, fileName.lastIndexOf('.')),
    typeId: fileName.slice(0, fileName.lastIndexOf('.')),
  };

  return res;
}

async function query(ruleBundle: RuleBundle): Promise<any[]> {
  const source = ruleBundle.source;

  if (!source) {
    throw new Error(`Source with id '${ruleBundle.rule.sourceId}' not found`);
  }

  if (source.sourceType !== 'database') {
    throw new Error(
      `query handler only handles sources with 'database' type, but got '${source.sourceType}' instead.`
    );
  }

  const db = knex({
    client: source.databaseType,
    connection: source.connectionString,
  });
  let result = await db.raw(
    (ruleBundle.rule.sourceConfig as SyncDbConfig).selectStatement
  );
  console.log(`found ${result?.rows?.length} items`);
  return result?.rows;
}
