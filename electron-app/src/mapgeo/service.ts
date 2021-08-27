import fetch, { RequestInit } from 'node-fetch';
import * as https from 'https';
import logger from '../logger';
import { URL } from 'url';

let service: MapgeoService;
const logScope = logger.scope('mapgeo service');
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export const getService = () => {
  if (!service) {
    throw new Error('MapGeo service not setup');
  }

  return service;
};

export type UploaderTokenResult = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: string;
};

export type UploadedMetadata = {
  key: string;
  filename: string;
  fieldname: string;
  table: string;
};

export type CartoDirectResult = {
  key: string;
};

export interface Optout {
  dataset: string;
  datasetItemId: string;
  id: string;
}

export default class MapgeoService {
  token: string;
  config: Record<string, unknown>;
  headers: Record<string, string> = {};
  host: string = '';

  static async fromUrl(host: string) {
    const url = new URL(host);
    const origin = url.origin;

    // cached instance
    if (origin && service?.host === origin) {
      return service;
    }

    try {
      const result = await fetch(`${origin}/api/config/current`, {
        agent: httpsAgent,
      });
      const data = await result.json();
      const config = result.status < 400 && data;

      if (config) {
        const instance = new MapgeoService(origin, config);
        service = instance;
        return instance;
      }
      throw new Error('URL is either incorrect or service is down');
    } catch (e) {
      logScope.log('setting up mapgeo service error: ', e);
      throw e;
    }
  }

  constructor(host: string, config: Record<string, unknown>) {
    this.config = config;
    this.host = host;
    this.headers = {};
  }

  async #fetch(url: string, options: RequestInit = {}) {
    const baseUrl = this.host;
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      this.headers,
      options.headers || {}
    );

    if (!('Authorization' in headers)) {
      logScope.log('Headers Without Authorization: ', headers);
    }

    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      agent: httpsAgent,
      headers,
    });
    return response.json();
  }

  async login(email: string, password: string) {
    try {
      const result = await this.#fetch(`/auth/login`, {
        method: 'post',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!result.token) {
        if (result.statusCode) {
          throw new Error(`MapGeo login error: ${result.statusCode}`);
        }
        throw new Error(result);
      }

      this.token = result.token;
      this.headers = { Authorization: `Bearer ${this.token}` };
      return true;
    } catch (e) {
      logScope.log('login error: ', e);
      throw e;
    }
  }

  logout() {
    this.token = undefined;
    this.headers = {};
  }

  async getUploaderTokens() {
    const result = await this.#fetch(`/api/uploader/token`);
    return result as UploaderTokenResult;
  }

  async findDataset(id: string) {
    const result = await this.#fetch(`/api/config/datasets/${id}`);
    return result.dataset;
  }

  async notifyUploader({
    datasetId,
    uploads,
    updateDate,
    notificationEmail,
    intersect,
  }: {
    datasetId: string;
    uploads: UploadedMetadata[];
    notificationEmail?: string;
    intersect?: boolean;
    updateDate?: boolean;
  }) {
    try {
      const result = await this.#fetch(
        `/api/uploader/${datasetId}/cartodb/direct`,
        {
          method: 'post',
          body: JSON.stringify({
            earlyFinish: true,
            updateDate,
            email: notificationEmail,
            intersect,
            uploads,
          }),
        }
      );
      logScope.log('notifyUploader: ', result);
      return result as CartoDirectResult;
    } catch (e) {
      logScope.log('notifyUploader error: ', e.data);
      throw e;
    }
  }

  async getOptouts(datasetId: string): Promise<Optout[]> {
    const result = await this.#fetch(`/api/optouts/${datasetId}`);

    return result.optouts;
  }

  async insertOptouts(datasetId: string, ids: string[]) {
    const result = await this.#fetch(`/api/optouts/${datasetId}`, {
      method: 'put',
      body: JSON.stringify(ids),
    });

    switch (result.status) {
      case 200: {
        return {
          data: result,
          numDeleted: ids.length,
        };
      }

      case 401: {
        return this.createError('deleteOptouts: Unauthorized');
      }

      case 404: {
        return this.createError('deleteOptouts: Bad Host (404)');
      }

      default: {
        return this.createError(
          `deleteOptouts: (${result.statusText}) ${JSON.stringify(result.data)}`
        );
      }
    }
  }

  async deleteOptouts(datasetId: string, ids: string[]) {
    const result = await this.#fetch(`/api/optouts/${datasetId}/delete`, {
      method: 'put',
      body: JSON.stringify(ids),
    });

    return result.optout ? true : false;
  }

  private createError(message: string) {
    return { ok: false, error: new Error(message) };
  }
}
