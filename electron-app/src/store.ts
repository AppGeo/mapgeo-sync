import * as Store from 'electron-store';
import * as schema from './store-schema.json';

export type SyncStoreType = {
  scheduleRule?: string;
  scheduleStarted?: boolean;
  scheduleRunning?: boolean;
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
};

export type SyncStore = Store<SyncStoreType>;

export const store = new Store<SyncStoreType>({
  // Copied from store-schema.json, can't import it, some reason TS complains
  // Don't modify manually, update the types above, and run `yarn generate:store-schema` or just build
  schema: {
    configUpdate: {
      format: 'date-time',
      type: 'string',
    },
    mapgeo: {
      additionalProperties: false,
      properties: {
        config: {
          additionalProperties: false,
          properties: {
            datasets: {
              items: {
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                  },
                  name: {
                    type: 'string',
                  },
                },
                required: ['id', 'name'],
                type: 'object',
              },
              type: 'array',
            },
            name: {
              type: 'string',
            },
          },
          required: ['name', 'datasets'],
          type: 'object',
        },
        host: {
          type: 'string',
        },
        login: {
          additionalProperties: false,
          properties: {
            email: {
              type: 'string',
            },
            password: {
              type: 'string',
            },
          },
          required: ['email', 'password'],
          type: 'object',
        },
      },
      type: 'object',
    },
    scheduleRule: {
      type: 'string',
    },
    scheduleRunning: {
      type: 'boolean',
    },
    scheduleStarted: {
      type: 'boolean',
    },
  },
});
