import { RuleBundle } from 'mapgeo-sync-config';
import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';
import * as fgdb from 'fgdb';
import * as csv from 'csvtojson';

export default async function fileAction(ruleBundle: RuleBundle) {
  const rule = ruleBundle.rule;

  if (ruleBundle.source.sourceType !== 'file') {
    throw new Error(
      `Only sources with a sourceType of 'file' can be processed by this handler.`
    );
  }

  if (!('filePath' in rule.sourceConfig)) {
    throw new Error(
      `Only rules with a configured 'sourceConfig.filePath' can be processed by this handler`
    );
  }

  if (!fs.existsSync(rule.sourceConfig.filePath)) {
    throw new Error(`The file '${rule.sourceConfig.filePath}' does not exist`);
  }

  const ext = path.extname(rule.sourceConfig.filePath);

  switch (rule.sourceConfig.fileType) {
    case 'gdb': {
      if (fs.lstatSync(rule.sourceConfig.filePath).isDirectory()) {
        const file = await fgdb(rule.sourceConfig.filePath);
        const layer = file[rule.sourceConfig.gdbLayerName];

        if (!layer) {
          throw new Error(
            `GDB layer name '${rule.sourceConfig.gdbLayerName}' returned no results`
          );
        }
        return { ext: '.gdb', data: layer as FeatureCollection };
      }

      throw new Error(
        `The selected path '${rule.sourceConfig.filePath}' must be a folder to read the File GeoDatabase`
      );
    }

    // TODO: Doesn't work, since fgdb only supports zip in the browser
    // case '.zip': {
    //   if (rule.sourceConfig.filePath.endsWith('.gdb.zip')) {
    //     const file = await fgdb(rule.sourceConfig.filePath);
    //     return { ext, data: file as FeatureCollection };
    //   }

    //   throw new Error(
    //     'Only *.gdb.zip (File GeoDatabase) files are supported at this time.'
    //   );
    // }

    case 'geojson': {
      const fileBuffer = await fs.promises.readFile(rule.sourceConfig.filePath);
      const file = fileBuffer.toString('utf-8');
      return { ext, data: JSON.parse(file) as FeatureCollection };
    }

    case 'json': {
      const fileBuffer = await fs.promises.readFile(rule.sourceConfig.filePath);
      const file = fileBuffer.toString('utf-8');
      return { ext, data: JSON.parse(file) as Record<string, unknown>[] };
    }

    case 'csv': {
      const file = await csv().fromFile(rule.sourceConfig.filePath);
      return { ext, data: file as Record<string, unknown>[] };
    }

    default: {
      throw new Error(`Unsupported file extension '${ext}' for file sync.`);
    }
  }
}
