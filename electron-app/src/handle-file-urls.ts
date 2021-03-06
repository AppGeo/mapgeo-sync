import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const access = promisify(fs.access);

//
// Patch asset loading -- Ember apps use absolute paths to reference their
// assets, e.g. `<img src="/images/foo.jpg">`. When the current URL is a `file:`
// URL, that ends up resolving to the absolute filesystem path `/images/foo.jpg`
// rather than being relative to the root of the Ember app. So, we intercept
// `file:` URL request and look to see if they point to an asset when
// interpreted as being relative to the root of the Ember app. If so, we return
// that path, and if not we leave them as-is, as their absolute path.
//
export async function getAssetPath(emberAppDir: string, url: string) {
  let urlPath = fileURLToPath(url);
  // Get the root of the path -- should be '/' on MacOS or something like
  // 'C:\' on Windows
  let { root } = path.parse(urlPath);
  // Get the relative path from the root to the full path
  let relPath = path.relative(root, urlPath);
  // Join the relative path with the Ember app directory
  let appPath = path.join(emberAppDir, relPath);
  try {
    await access(appPath);
    return appPath;
  } catch (e) {
    return urlPath;
  }
}

export default function handleFileURLs(emberAppDir: string) {
  const { protocol } = require('electron');

  protocol.interceptFileProtocol(
    'file',
    async ({ url }: { url: string }, callback: Function) => {
      callback(await getAssetPath(emberAppDir, url));
    }
  );
}
