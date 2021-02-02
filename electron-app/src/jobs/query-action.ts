import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import MapgeoService from '../mapgeo-service';
import handleQueryAction from '../action-handlers/query';
import S3Service from '../s3-service';
import { QueryAction } from 'mapgeo-sync-config';

const { config } = workerData;

if (parentPort) {
  parentPort.on('message', async (msg: string | unknown) => {
    if (typeof msg !== 'object') {
      console.log('Low-level event: ', msg);
      return;
    }

    const { event, data } = msg as any;
    console.log(`Handling '${event}'...`);

    switch (event) {
      case 'handle-action': {
        await handleAction(data as QueryAction);
        break;
      }

      case 'close': {
        parentPort.postMessage('done');
        break;
      }
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
  // console.log('action result: ', result);
  const s3 = new S3Service(tokens);
  const { key, fileName } = await s3.upload({
    folder: `ilya-test-${subdomain}`,
    fileName: action.FileName,
    data: JSON.stringify(result.rows, null, 2),
  });
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
  const status = await s3.waitForFile(res.key);
  console.log('status res: ', status);

  workerData.port.postMessage(result);
}
