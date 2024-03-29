import { RuleBundle } from 'mapgeo-sync-config';
import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';
import * as fgdb from 'fgdb';
import * as csv from 'csvtojson';
import { pipe } from 'pipeline-pipe';
import * as StreamValues from 'stream-json/streamers/StreamValues';
import * as StreamArray from 'stream-json/streamers/StreamArray';
// @ts-ignore
import { parse } from 'JSONStream';
import logger from '../logger';

const logScope = logger.scope('source-handlers/file');

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
        let file: Record<string, unknown>;

        try {
          file = await fgdb(rule.sourceConfig.filePath);
        } catch (e) {
          logScope.log(
            `Processing '${rule.sourceConfig.filePath}' stack: ${e.stack}`
          );
          throw new Error(
            `Processing '${rule.sourceConfig.filePath}' failed due to: ` +
              e.message || e
          );
        }

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
      const data = fs
        .createReadStream(rule.sourceConfig.filePath)
        .pipe(parse('features.*'));
      return { ext, data };
    }

    case 'json': {
      const data = fs
        .createReadStream(rule.sourceConfig.filePath)
        .pipe(StreamArray.withParser())
        .pipe(
          pipe(({ value }: { key: number; value: Record<string, unknown> }) => {
            return value;
          })
        );

      return { ext, data };
    }

    case 'csv': {
      try {
        const data = fs
          .createReadStream(rule.sourceConfig.filePath)
          .pipe(csv())
          .pipe(StreamValues.withParser())
          .pipe(
            pipe(
              ({ value }: { key: number; value: Record<string, unknown> }) => {
                return value;
              }
            )
          );

        return { ext, data };
      } catch (e) {
        logScope.error('Error processing csv: ', e);
        throw e;
      }
    }

    default: {
      throw new Error(`Unsupported file extension '${ext}' for file sync.`);
    }
  }
}
