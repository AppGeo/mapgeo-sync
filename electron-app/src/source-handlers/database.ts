import knex from 'knex';
import { RuleBundle, Source, SyncDbConfig } from 'mapgeo-sync-config';
// @ts-ignore
import * as ConnectionsString from 'mssql/lib/connectionstring';
import { PassThrough } from 'stream';

export async function test(source: Source) {
  const { db, source: dbSource } = initDb(source);

  if (dbSource.databaseType === 'oracle') {
    try {
      const result = await db
        .select<{ test: number }[]>(db.raw('1 as test'))
        .from('dual');
      return result.length && result[0].test === 1;
    } catch (e) {
      throw e;
    }
  }

  try {
    const result = await db.select<{ test: number }[]>(db.raw('1 as test'));

    return result.length && result[0].test === 1;
  } catch (e) {
    throw e;
  }
}

export function query(
  ruleBundle: RuleBundle
): PassThrough & AsyncIterable<unknown> {
  const source = ruleBundle.source;

  if (!source) {
    throw new Error(`Source with id '${ruleBundle.rule.sourceId}' not found`);
  }

  const { db } = initDb(source);

  let result = db.raw(
    (ruleBundle.rule.sourceConfig as SyncDbConfig).selectStatement
  );

  // console.log(`found ${result?.rows?.length} items`);

  return result.stream();
}

function initDb(source: Source) {
  if (source.sourceType !== 'database') {
    throw new Error(
      `query handler only handles sources with 'database' type, but got '${source.sourceType}' instead.`
    );
  }

  const connection =
    source.databaseType === 'mssql'
      ? ConnectionsString.resolve(source.connectionString)
      : source.connectionString;

  const db = knex({
    client: source.databaseType,
    connection,
  });

  return { db, source };
}
