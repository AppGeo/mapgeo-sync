import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import MapgeoService from '../mapgeo-service';
import handleQueryAction from '../action-handlers/query';
import S3Service from '../s3-service';
import { SyncConfig, QueryAction } from 'mapgeo-sync-config';

interface WorkerData {
  config: SyncConfig;
  port: MessagePort;
}

type HandleActionMessage = {
  event: 'handle-action';
  data: QueryAction;
};
type CloseMessage = { event: 'close' };
type Message = HandleActionMessage | CloseMessage;
type FinishedResponse = {
  status: string;
  rows: any[];
};
type ErrorResponse = {
  errors: {
    message: string;
    event: Message['event'];
  }[];
};
type Response = FinishedResponse | ErrorResponse;

const { config, port } = workerData as WorkerData;

if (parentPort) {
  parentPort.on('message', async (msg: string | Message) => {
    if (typeof msg !== 'object') {
      console.log('Low-level event: ', msg);
      return;
    }

    const { event } = msg;
    console.log(`Handling '${event}'...`);

    switch (event) {
      case 'handle-action': {
        try {
          await handleAction((msg as HandleActionMessage).data);
        } catch (error) {
          respond({
            errors: [
              {
                message: error.toString(),
                event,
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
        const _exhaustiveCheck: never = event;
    }
  });
}

async function handleAction(action: QueryAction) {
  action = action || config.UploadActions[0];

  if (!config?.MapGeoOptions?.Host) {
    throw new Error('MapGeoOptions.Host is a required config property');
  }
  const url = new URL(config.MapGeoOptions.Host);
  const subdomain = url.hostname.split('.')[0];
  const mapgeo = await MapgeoService.login(
    config.MapGeoOptions.Host,
    config.MapGeoOptions.Email,
    config.MapGeoOptions.Password
  );

  const result = await handleQueryAction(subdomain, action);
  const tokens = await mapgeo.getUploaderTokens();
  const transformed = result.rows.map((row) => {
    try {
      return { ...row, the_geom: JSON.parse(row.the_geom) };
    } catch (e) {
      return row;
    }
  });
  const geojson = action.FormatAsGeoJson
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
  const file = action.FormatAsGeoJson
    ? action.FileName.replace('.json', '.geojson')
    : action.FileName;
  const { key, fileName } = await s3.upload({
    folder,
    fileName: file,
    data: JSON.stringify(geojson || transformed, null, 2),
  });
  // Lets MapGeo know, which validates and uploads to carto
  // An upload-status.json is uploaded to s3 with results of process, failure or success
  const res = await mapgeo.notifyUploader({
    datasetId: action.DatasetId,
    updateDate: config.MapGeoOptions.UpdateDate,
    notificationEmail: config.MapGeoOptions.NotificationEmail,
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

  respond({ status: status.content as string, rows: result.rows });
}

function respond(response: Response) {
  port.postMessage(response);
}
