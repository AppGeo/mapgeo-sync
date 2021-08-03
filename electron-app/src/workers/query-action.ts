import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import type { FeatureCollection } from 'geojson';
import MapgeoService from '../mapgeo/service';
import handleQueryAction from '../action-handlers/query';
import handleFileAction from '../action-handlers/file';
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

interface WorkerData {
  mapgeo: SyncStoreType['mapgeo'];
  config: SyncConfig;
}

type HandleRuleMessage = {
  event: 'handle-rule';
  data: RuleBundle;
};
type CloseMessage = { event: 'close' };
export type QueryActionMessage = HandleRuleMessage | CloseMessage;
export type FinishedResponse = {
  rule: SyncRule;
  source: Source;
  status: UploadStatus;
  rows: unknown[] | FeatureCollection;
};
export type ErrorResponse = {
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
    type: 'warning' | 'error';
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

async function handleRule(ruleBundle: RuleBundle) {
  if (!mapgeo.host) {
    throw new Error('mapgeo.host is a required config property');
  }
  const url = new URL(mapgeo.host);
  const subdomain = url.hostname.split('.')[0];
  const mapgeoService = await MapgeoService.fromUrl(mapgeo.host);

  await mapgeoService.login(mapgeo.login.email, mapgeo.login.password);

  const result = await loadData(ruleBundle);
  const metadata = uploadMetadata(subdomain, ruleBundle);
  const tokens = await mapgeoService.getUploaderTokens();

  // console.log('action result: ', result);
  const s3 = new S3Service(tokens);
  const folder = `ilya-test-${subdomain}`;
  const ruleFileName = `rule_${ruleBundle.rule.id}.json`;
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
    // notificationEmail: 'ivradchenko@appgeo.com',
    uploads: [
      {
        key,
        filename: fileName,
        fieldname: metadata.fieldname,
        table: metadata.table, // for finding layers, unused for now
      },
    ],
  });
  console.log('notify res: ', res);
  // Poll for upload-status.json file to know if error or success
  const status = await s3.waitForFile(res.key);
  console.log('status res: ', status);

  respond({
    status: status.content as UploadStatus,
    rows: result,
    ...ruleBundle,
  });
}

async function loadData(
  ruleBundle: RuleBundle
): Promise<unknown[] | FeatureCollection> {
  switch (ruleBundle.source.sourceType) {
    case 'file': {
      const { ext, data } = await handleFileAction(ruleBundle);
      const transformed = transformData(data, { ext }) as unknown[];
      return transformed;
    }
    case 'database': {
      const data = await handleQueryAction(ruleBundle);
      const transformed = transformData(data, {
        toGeoJson: true,
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
          await handleRule(msg.data);
        } catch (error) {
          logger.scope('query-action').warn(error);
          respond({
            ...msg.data,
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
