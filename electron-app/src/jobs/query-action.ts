import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import MapgeoService from '../mapgeo-service';
import handleQueryAction from '../action-handlers/query';
import { upload as uploadToS3 } from '../s3-service';

(async () => {
  let { config, action } = workerData;
  action = action || config.UploadActions[0];

  if (!config?.MapGeoOptions?.Host) {
    throw new Error('MapGeoOptions.Host is a required config property');
  }
  const url = new URL(config.MapGeoOptions.Host);
  const subdomain = url.hostname.split('.')[0];
  const result = await handleQueryAction(subdomain, action);

  const mapgeo = await MapgeoService.login(
    config.MapGeoOptions.Host,
    config.MapGeoOptions.Email,
    config.MapGeoOptions.Password
  );
  let tokens = await mapgeo.getUploaderTokens();
  console.log('action result: ', result);
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
  if (parentPort) {
    parentPort.postMessage('done');
  }
})();
