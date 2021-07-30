import { RuleBundle } from 'mapgeo-sync-config';
import * as fs from 'fs';
import * as path from 'path';

export default async function fileAction(ruleBundle: RuleBundle) {
  if (ruleBundle.source.sourceType !== 'file') {
    throw new Error(
      `Only sources with a sourceType of 'file' can be processed by this handler.`
    );
  }

  if (!('filePath' in ruleBundle.rule.sourceConfig)) {
    throw new Error(
      `Only rules with a configured 'sourceConfig.filePath' can be processed by this handler`
    );
  }

  const fileBuffer = await fs.promises.readFile(
    ruleBundle.rule.sourceConfig.filePath
  );
  const file = fileBuffer.toString('utf-8');
  const ext = path.extname(ruleBundle.rule.sourceConfig.filePath);

  switch (ext) {
    case '.geojson':
    case '.json': {
      return JSON.parse(file);
    }

    default: {
      return file;
    }
  }
}
