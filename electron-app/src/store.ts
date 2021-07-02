import * as Store from 'electron-store';
import { Source, SyncRule } from '../../types/mapgeo-sync-config';

export type SyncStoreType = {
  configUpdate?: Date;
  mapgeo: {
    host?: string;
    login?: {
      email: string;
      password: string;
    };
    config?: {
      name: string;
      datasets: { id: string; name: string }[];
    };
  };
  syncRules: SyncRule[];
  sources: Source[];
};

export type SyncStore = Store<SyncStoreType>;

export const store = new Store<SyncStoreType>({
  // Copied from store-schema.json, can't import it, some reason TS complains
  // Don't modify manually, update the types above, and run `yarn generate:store-schema` or just build
  // schema: {
  //   configUpdate: {
  //     format: 'date-time',
  //     type: 'string',
  //   },
  //   mapgeo: {
  //     additionalProperties: false,
  //     properties: {
  //       config: {
  //         properties: {
  //           datasets: {
  //             items: {
  //               properties: {
  //                 id: {
  //                   type: 'string',
  //                 },
  //                 name: {
  //                   type: 'string',
  //                 },
  //               },
  //               required: ['id', 'name'],
  //               type: 'object',
  //             },
  //             type: 'array',
  //           },
  //           name: {
  //             type: 'string',
  //           },
  //         },
  //         required: ['name', 'datasets'],
  //         type: 'object',
  //       },
  //       host: {
  //         type: 'string',
  //       },
  //       login: {
  //         additionalProperties: false,
  //         properties: {
  //           email: {
  //             type: 'string',
  //           },
  //           password: {
  //             type: 'string',
  //           },
  //         },
  //         required: ['email', 'password'],
  //         type: 'object',
  //       },
  //     },
  //     type: 'object',
  //   },
  //   syncRules: {
  //     items: {
  //       type: 'object',
  //       properties: {
  //         datasetId: {
  //           type: 'string',
  //         },
  //         schedule: {
  //           additionalProperties: false,
  //           properties: {
  //             rule: {
  //               type: 'string',
  //             },
  //             running: {
  //               type: 'boolean',
  //             },
  //             started: {
  //               type: 'boolean',
  //             },
  //           },
  //           type: 'object',
  //         },
  //         sourceId: {
  //           type: 'string',
  //         },
  //       },
  //     },
  //     type: 'array',
  //   },
  // },
});

console.log(`Store path: ${store.path}`);
