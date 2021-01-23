(async () => {
  const handleQueryAction = require('../action-handlers/query').default;
  const { URL } = require('url');
  const { workerData, parentPort } = require('worker_threads');
  let { config, action } = workerData;
  console.log(config);
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
