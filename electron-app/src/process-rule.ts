import { URL } from 'url';
import type { FeatureCollection } from 'geojson';
import MapgeoService from './mapgeo/service';
import { query as queryDatabaseSource } from './source-handlers/database';
import handleFileSource from './source-handlers/file';
import S3Service from './s3-service';
import {
  UploadMetadata,
  RuleBundle,
  Source,
  SyncRule,
} from 'mapgeo-sync-config';
import { SyncStoreType } from './store/store';
import { typeConversion } from './utils/table-mappings';
import logger from './logger';
import { Readable, Stream } from 'stream';
// @ts-ignore
import { stringify } from 'JSONStream';
import GeoJSONStringify from './utils/feature-collection-transform';
import { pipe } from 'pipeline-pipe';

const logScope = logger.scope('process-rule');

type HandleRuleData = {
  runId: string;
  ruleBundle: RuleBundle;
  mapgeo: SyncStoreType['mapgeo'];
};
export type FinishedResponse = {
  runId: string;
  rule: SyncRule;
  source: Source;
  status: UploadStatus;
  numItems: number;
};
export type ErrorResponse = {
  runId: string;
  rule: SyncRule;
  source: Source;
  numItems: number;
  errors: {
    message: string;
    event: 'handle-rule';
  }[];
};
export type QueryActionResponse = FinishedResponse | ErrorResponse;

export interface UploadStatus {
  ok: boolean;
  messages: {
    type: 'warning' | 'error' | 'success';
    message: string;
  }[];
  intersection: {
    ok: boolean;
    skipped: boolean;
  };
  date: string;
}

export async function processRule(
  data: HandleRuleData
): Promise<QueryActionResponse> {
  console.log(`Handling '${data.ruleBundle.rule.name}'...`);

  try {
    const mapgeoService = await setupMapGeo(data.mapgeo);
    const resultData = await handleRule(
      mapgeoService,
      data.ruleBundle,
      data.runId,
      data.mapgeo
    );
    const ruleBundle = data.ruleBundle;

    if (ruleBundle.rule.optoutRule) {
      const optoutBundle = {
        rule: ruleBundle.rule.optoutRule,
        source: ruleBundle.source,
      };
      const optoutData = await loadData(optoutBundle);
      const optoutResult = await handleOptoutRule(
        mapgeoService,
        optoutBundle,
        optoutData as any
      );

      resultData.status.messages.push(optoutResult.message);
      resultData.status.ok = optoutResult.ok;
    }

    return {
      runId: data.runId,
      ...resultData,
    };
  } catch (error) {
    logger.scope('query-action').warn(error);

    return {
      runId: data.runId,
      numItems: 0,
      ...data.ruleBundle,
      errors: [
        {
          message: error.toString(),
          event: 'handle-rule',
        },
      ],
    };
  }
}

async function setupMapGeo(mapgeo: SyncStoreType['mapgeo']) {
  if (!mapgeo.host) {
    throw new Error('mapgeo.host is a required config property');
  }

  const mapgeoService = await MapgeoService.fromUrl(mapgeo.host);

  await mapgeoService.login(mapgeo.login.email, mapgeo.login.password);

  return mapgeoService;
}

async function handleRule(
  mapgeoService: MapgeoService,
  ruleBundle: RuleBundle,
  runId: string,
  mapgeo: SyncStoreType['mapgeo']
) {
  const url = new URL(mapgeo.host);
  const subdomain = url.hostname.split('.')[0];

  const result = await loadData(ruleBundle);
  const metadata = uploadMetadata(subdomain, ruleBundle);

  logScope.info('Acquiring mapgeo credentials..');
  const tokens = await mapgeoService.getUploaderTokens();

  logScope.info('Acquired mapgeo credentials.');
  // console.log('action result: ', result);
  const s3 = new S3Service(tokens);
  const folder = `ilya-test-${subdomain}`;
  const ruleFileName = `rule_${ruleBundle.rule.id}__${runId}.json`;
  const file = !Array.isArray(result)
    ? ruleFileName.replace('.json', '.geojson')
    : ruleFileName;

  let stream: Readable;

  if (result.isGeoJson) {
    stream = result.stream.pipe(new GeoJSONStringify());
  } else {
    stream = result.stream.pipe(stringify());
  }

  logScope.info('Sending to s3..');
  const { key, fileName } = await s3.upload({
    folder,
    fileName: file,
    data: stream,
  });

  logScope.info('Waiting for upload to finish on mapgeo..');
  // Lets MapGeo know, which validates and uploads to carto
  // An upload-status.json is uploaded to s3 with results of process, failure or success
  const res = await mapgeoService.notifyUploader({
    datasetId: ruleBundle.rule.datasetId,
    updateDate: true,
    notificationEmail: ruleBundle.rule.sendNotificationEmail
      ? mapgeo.login?.email
      : undefined,
    intersect: ruleBundle.rule.updateIntersection,
    uploads: [
      {
        key,
        filename: fileName,
        fieldname: metadata.fieldname,
        table: metadata.table, // for finding layers, unused for now
      },
    ],
  });
  logScope.log('notify uploader res: ', res);
  // Poll for upload-status.json file to know if error or success
  const status = (await s3.waitForFile(res.key)) as { content: UploadStatus };
  logScope.log('upload-status.json content: ', status.content);

  // const numRows = !('features' in result) ? result.length : 0;
  // const numItems = 'features' in result ? result.features.length : numRows;

  return {
    status: status.content,
    numItems: 1,
    ...ruleBundle,
  };
}

async function handleOptoutRule(
  mapgeoService: MapgeoService,
  ruleBundle: RuleBundle,
  data: Record<string, unknown>[]
): Promise<{
  ok: boolean;
  message: { type: 'warning' | 'error' | 'success'; message: string };
}> {
  if (!data || !data.length) {
    return {
      ok: true,
      message: {
        type: 'warning',
        message: `Skipping optouts because there is no data.`,
      },
    };
  }

  const firstItem = data[0];

  if (!('optout' in firstItem)) {
    return {
      ok: false,
      message: {
        type: 'error',
        message: `Optout data is invalid, each row must contain a 'optout' property that is the identifier.`,
      },
    };
  }

  const logScope = logger.scope('handleOptoutRule');
  const rule = ruleBundle.rule;
  const currentOptouts = await mapgeoService.getOptouts(rule.datasetId);

  logScope.log(`Had ${currentOptouts?.length} optouts previously`);

  if (currentOptouts?.length) {
    await mapgeoService.deleteOptouts(
      rule.datasetId,
      currentOptouts.map((optout) => optout.datasetItemId)
    );
  }

  await mapgeoService.insertOptouts(
    rule.datasetId,
    data.map((item: { optout: string }) => item.optout)
  );

  return {
    ok: true,
    message: {
      type: 'success',
      message: `Successfully inserted ${data.length} optouts.`,
    },
  };
}

async function loadData(ruleBundle: RuleBundle) {
  switch (ruleBundle.source.sourceType) {
    case 'file': {
      const { ext, data } = await handleFileSource(ruleBundle);
      const stream = transformData(data as any, { ext });
      return { ext, stream, isGeoJson: false };
    }
    case 'database': {
      const data = await queryDatabaseSource(ruleBundle);
      const toGeoJson = data.length && (data[0] as any).the_geom ? true : false;
      const stream = transformData(data as any, {
        toGeoJson,
      });
      return { isGeoJson: toGeoJson, stream };
    }
    default:
      const exhaustiveCheck: never = ruleBundle.source;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
  }
}

function transformData(
  data: Stream,
  options: { toGeoJson?: boolean; ext?: string } = {}
) {
  return data.pipe(
    pipe((item) => {
      if (options.ext === '.csv') {
        if (options.toGeoJson) {
          const { the_geom, ...properties } = item;
          const geometry =
            typeof the_geom === 'string'
              ? JSON.parse(the_geom)
              : typeof the_geom === 'object'
              ? the_geom
              : null;

          return {
            type: 'Feature',
            properties,
            geometry,
          };
        }
      } else if (options.ext !== '.geojson') {
        return { ...item, the_geom: JSON.parse(item.the_geom) };
      }

      return item;
    })
  );
}

function uploadMetadata(community: string, ruleBundle: RuleBundle) {
  const fileName = `${community}_rule_${ruleBundle.rule.id}.json`;

  const res: UploadMetadata = {
    fieldname:
      typeConversion.get(ruleBundle.rule.mappingId) ||
      ruleBundle.rule.mappingId,
    table: fileName.slice(0, fileName.lastIndexOf('.')),
    typeId: fileName.slice(0, fileName.lastIndexOf('.')),
  };

  return res;
}
