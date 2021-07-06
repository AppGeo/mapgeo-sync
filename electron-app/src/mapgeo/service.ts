import fetch, { RequestInit } from 'node-fetch';
import * as https from 'https';

let service: MapgeoService;
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

export default class MapgeoService {
  host: string;
  token: string;
  config: Record<string, unknown>;
  #headers: Record<string, string> = {};
  #host: string = '';

  static async fromUrl(host: string) {
    // cached instance
    if (host && service?.host === host) {
      return service;
    }

    try {
      const result = await fetch(`${host}/api/config/current`, {
        agent: httpsAgent,
      });
      const data = await result.json();
      const config = result.status < 400 && data;

      if (config) {
        const instance = new MapgeoService(host, config);
        service = instance;
        return instance;
      }
      throw new Error('URL is either incorrect or service is down');
    } catch (e) {
      console.log('ping error: ', e);
      throw e;
    }
  }

  constructor(host: string, config: Record<string, unknown>) {
    const headers: Record<string, string> = {};

    this.host = host;
    this.config = config;
    this.#host = host;
    this.#headers = headers;
  }

  async #fetch(url: string, options: RequestInit = {}) {
    const baseUrl = this.#host;
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      agent: httpsAgent,
      headers: Object.assign({}, this.#headers, options.headers || {}),
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

      this.token = result.token;
      this.#headers = { Authorization: `Bearer ${this.token}` };
      return true;
    } catch (e) {
      console.log('login error: ', e);
      throw e;
    }
  }

  async getUploaderTokens() {
    const result = await this.#fetch(`/api/uploader/token`);
    return result.data as UploaderTokenResult;
  }

  async findDataset(id: string) {
    const result = await this.#fetch(`/api/config/datasets/${id}`);
    debugger;
    return result.data.dataset;
  }

  async notifyUploader({
    datasetId,
    uploads,
    updateDate,
    notificationEmail,
  }: {
    datasetId: string;
    uploads: UploadedMetadata[];
    notificationEmail: string;
    updateDate: boolean;
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
            uploads,
          }),
        }
      );
      console.log('notifyUploader: ', result.data);
      return result.data as CartoDirectResult;
    } catch (e) {
      console.log('notifyUploader error: ', e.data);
      throw e;
    }
  }

  async getOptouts(datasetId: string) {
    const result = await this.#fetch(`/api/optouts/${datasetId}`);
    let response;

    switch (result.status) {
      case 200: {
        response = result.data;
        break;
      }

      case 401: {
        response = this.createError('getOptouts: Unauthorized');
        break;
      }

      case 404: {
        response = this.createError('getOptouts: Bad Host (404)');
        break;
      }

      default: {
        response = this.createError(
          `getOptouts: (${result.statusText}) ${JSON.stringify(result.data)}`
        );
      }
    }

    return response;
  }

  async deleteOptouts(datasetId: string, ids: string[]) {
    const result = await this.#fetch(`/api/optouts/${datasetId}`, {
      method: 'put',
      body: JSON.stringify(ids),
    });
    let response;

    switch (result.status) {
      case 200: {
        response = result.data;
        response.deleted = 1;
        break;
      }

      case 401: {
        response = this.createError('deleteOptouts: Unauthorized');
        break;
      }

      case 404: {
        response = this.createError('deleteOptouts: Bad Host (404)');
        break;
      }

      default: {
        response = this.createError(
          `deleteOptouts: (${result.statusText}) ${JSON.stringify(result.data)}`
        );
      }
    }

    return response;
  }

  private createError(message: string) {
    return { ok: false, error: new Error(message) };
  }
}
