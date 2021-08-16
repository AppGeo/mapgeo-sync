import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import type { FeatureCollection } from 'geojson';
import MapgeoService from '../mapgeo/service';
import handleDatabaseSource from '../source-handlers/database';
import handleFileSource from '../source-handlers/file';
import S3Service from '../s3-service';
import {
  UploadMetadata,
  RuleBundle,
  Source,
  SyncConfig,
  SyncRule,
} from 'mapgeo-sync-config';
import { SyncStoreType } from '../store/store';
import { typeConversion } from '../utils/table-mappings';
import logger from '../logger';

const logScope = logger.scope('worker/query-action');

interface WorkerData {
  mapgeo: SyncStoreType['mapgeo'];
  config: SyncConfig;
}

type HandleRuleMessage = {
  event: 'handle-rule';
  data: {
    runId: string;
    ruleBundle: RuleBundle;
  };
};
type CloseMessage = { event: 'close' };
export type QueryActionMessage = HandleRuleMessage | CloseMessage;
export type FinishedResponse = {
  runId: string;
  rule: SyncRule;
  source: Source;
  status: UploadStatus;
  rows: unknown[] | FeatureCollection;
};
export type ErrorResponse = {
  runId: string;
  rule: SyncRule;
  source: Source;
  errors: {
    message: string;
    event: QueryActionMessage['event'];
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

const { mapgeo } = workerData as WorkerData;

function respond(response: QueryActionResponse) {
  parentPort.postMessage(response);
}

if (parentPort) {
  parentPort.on('message', async (msg: string | QueryActionMessage) => {
    if (typeof msg !== 'object') {
      console.log('Low-level event: ', msg);
      return;
    }

    console.log(`Handling '${msg.event}'...`);

    switch (msg.event) {
      case 'handle-rule': {
        try {
          const mapgeoService = await setupMapGeo();
          const data = await handleRule(
            mapgeoService,
            msg.data.ruleBundle,
            msg.data.runId
          );
          const ruleBundle = msg.data.ruleBundle;

          if (ruleBundle.rule.optoutRule) {
            const optoutBundle = {
              rule: ruleBundle.rule.optoutRule,
              source: ruleBundle.source,
            };
            const optoutData = await loadData(optoutBundle);
            const optoutResult = await handleOptoutRule(
              mapgeoService,
              optoutBundle,
              optoutData as Record<string, unknown>[]
            );

            data.status.messages.push(optoutResult.message);
            data.status.ok = optoutResult.ok;
          }

          respond({
            runId: msg.data.runId,
            ...data,
          });
        } catch (error) {
          logger.scope('query-action').warn(error);
          respond({
            runId: msg.data.runId,
            ...msg.data.ruleBundle,
            errors: [
              {
                message: error.toString(),
                event: msg.event,
              },
            ],
          });
        }
        break;
      }

      case 'close': {
        parentPort.postMessage('done');
        break;
      }

      default:
        const exhaustiveCheck: never = msg;
        throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  });
}

async function setupMapGeo() {
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
  runId: string
) {
  const url = new URL(mapgeo.host);
  const subdomain = url.hostname.split('.')[0];

  const result = await loadData(ruleBundle);
  const metadata = uploadMetadata(subdomain, ruleBundle);
  const tokens = await mapgeoService.getUploaderTokens();

  // console.log('action result: ', result);
  const s3 = new S3Service(tokens);
  const folder = `ilya-test-${subdomain}`;
  const ruleFileName = `rule_${ruleBundle.rule.id}__${runId}.json`;
  const file = !Array.isArray(result)
    ? ruleFileName.replace('.json', '.geojson')
    : ruleFileName;
  const { key, fileName } = await s3.upload({
    folder,
    fileName: file,
    data: JSON.stringify(result, null, 2),
  });

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
  logScope.log('upload status res: ', status.content);

  return {
    status: status.content,
    rows: result,
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

async function loadData(
  ruleBundle: RuleBundle
): Promise<unknown[] | FeatureCollection> {
  switch (ruleBundle.source.sourceType) {
    case 'file': {
      const { ext, data } = await handleFileSource(ruleBundle);
      const transformed = transformData(data, { ext }) as unknown[];
      return transformed;
    }
    case 'database': {
      const data = await handleDatabaseSource(ruleBundle);
      const transformed = transformData(data, {
        toGeoJson: data.length && (data[0] as any).the_geom ? true : false,
      }) as FeatureCollection;
      return transformed;
    }
    default:
      const exhaustiveCheck: never = ruleBundle.source;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
  }
}

function transformData(
  data: unknown[] | FeatureCollection,
  options: { toGeoJson?: boolean; ext?: string } = {}
) {
  if (Array.isArray(data)) {
    if (options.toGeoJson) {
      return data.reduce(
        (all: any, row: any) => {
          const { the_geom, ...properties } = row;
          const geometry =
            typeof the_geom === 'string'
              ? JSON.parse(the_geom)
              : typeof the_geom === 'object'
              ? the_geom
              : null;
          all.features.push({
            type: 'Feature',
            properties,
            geometry,
          });
          return all;
        },
        { type: 'FeatureCollection', features: [] }
      );
    }

    return data.map((row: Record<string, unknown> & { the_geom: string }) => {
      try {
        return { ...row, the_geom: JSON.parse(row.the_geom) };
      } catch (e) {
        return row;
      }
    });
  } else {
    return data;
  }
}

function uploadMetadata(community: string, ruleBundle: RuleBundle) {
  const fileName = `${community}_rule_${ruleBundle.rule.id}.json`;

  console.log(`Uploading query file ${fileName} to cloud`);

  const res: UploadMetadata = {
    fieldname:
      typeConversion.get(ruleBundle.rule.mappingId) ||
      ruleBundle.rule.mappingId,
    table: fileName.slice(0, fileName.lastIndexOf('.')),
    typeId: fileName.slice(0, fileName.lastIndexOf('.')),
  };

  return res;
}
