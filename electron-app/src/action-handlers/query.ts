import knex from 'knex';
import { RuleBundle, SyncDbConfig } from 'mapgeo-sync-config';

export default async function handle(ruleBundle: RuleBundle) {
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
