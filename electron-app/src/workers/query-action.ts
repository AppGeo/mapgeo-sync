import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import MapgeoService from '../mapgeo/service';
import handleQueryAction from '../action-handlers/query';
import S3Service from '../s3-service';
import { RuleBundle, Source, SyncConfig, SyncRule } from 'mapgeo-sync-config';
import { SyncStoreType } from 'src/store/store';

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
  status: string;
  rows: any[];
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

const { config, mapgeo } = workerData as WorkerData;

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

  const result = await handleQueryAction(subdomain, ruleBundle);
  const tokens = await mapgeoService.getUploaderTokens();
  const transformed = result.rows.map((row) => {
    try {
      return { ...row, the_geom: JSON.parse(row.the_geom) };
    } catch (e) {
      return row;
    }
  });
  const formatAsGeoJson = false;
  const geojson = formatAsGeoJson
    ? transformed.reduce(
        (all, row) => {
          const { the_geom, ...properties } = row;
          all.features.push({
            type: 'Feature',
            properties,
            geometry: the_geom,
          });
          return all;
        },
        { type: 'FeatureCollection', features: [] }
      )
    : undefined;
  // console.log('action result: ', result);
  const s3 = new S3Service(tokens);
  const folder = `ilya-test-${subdomain}`;
  const ruleFileName = `rule_${ruleBundle.rule.id}.json`;
  const file = formatAsGeoJson
    ? ruleFileName.replace('.json', '.geojson')
    : ruleFileName;
  const { key, fileName } = await s3.upload({
    folder,
    fileName: file,
    data: JSON.stringify(geojson || transformed, null, 2),
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
        fieldname: result.fieldname,
        table: result.table,
      },
    ],
  });
  console.log('notify res: ', res);
  // Poll for upload-status.json file to know if error or success
  const status = await s3.waitForFile(res.key);
  console.log('status res: ', status);

  respond({
    status: status.content as string,
    rows: result.rows,
    ...ruleBundle,
  });
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
