import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import MapgeoService from '../mapgeo-service';
import handleQueryAction from '../action-handlers/query';
import upload from '../s3-service';

(async () => {
  let { config, action } = workerData;
  if (!config?.MapGeoOptions?.Host) {
    throw new Error('MapGeoOptions.Host is a required config property');
  }
  const url = new URL(config.MapGeoOptions.Host);
  const subdomain = url.hostname.split('.')[0];
  const result = await handleQueryAction(
    subdomain,
    action || config.UploadActions[0]
  );

  const mapgeo = await MapgeoService.login(
    config.MapGeoOptions.Host,
    config.MapGeoOptions.Email,
    config.MapGeoOptions.Password
  );
  let tokens = await mapgeo.getUploaderTokens();
  await upload(tokens, '{ "test": true }');

  // console.log(result);
  workerData.port.postMessage(result);
  if (parentPort) {
    parentPort.postMessage('done');
  }
})();
