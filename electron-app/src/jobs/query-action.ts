import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import MapgeoService from '../mapgeo-service';
import handleQueryAction from '../action-handlers/query';
import { upload as uploadToS3 } from '../s3-service';
import { QueryAction } from 'mapgeo-sync-config';

const { config } = workerData;

if (parentPort) {
  parentPort.on('message', async ({ event, data }) => {
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
  const { key, fileName } = await uploadToS3(tokens, {
    folder: `ilya-test-${subdomain}`,
    file: action.FileName,
    data: JSON.stringify(result.rows, null, 2),
  });
  // await mapgeo.notifyUploader({
  //   updateDate: config.MapGeoOptions.UpdateDate,
  //   notificationEmail: config.MapGeoOptions.NotificationEmail,
  //   uploads: [
  //     {
  //       key,
  //       filename: fileName,
  //       fieldname: result.fieldname,
  //       table: result.table,
  //     },
  //   ],
  // });

  // console.log(result);
  workerData.port.postMessage(result);
}
