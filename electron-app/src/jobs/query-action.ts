import handleQueryAction from '../action-handlers/query';
import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';

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
  // console.log(result);
  workerData.port.postMessage(result);
  if (parentPort) {
    parentPort.postMessage('done');
  }
})();
