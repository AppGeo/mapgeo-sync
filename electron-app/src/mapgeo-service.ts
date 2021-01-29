import { ok } from 'assert';
import axios, { AxiosInstance } from 'axios';

export type UploaderTokenResult = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: string;
};

export default class MapgeoService {
  host: string;
  token: string;
  #axios: AxiosInstance;

  static async login(host: string, email: string, password: string) {
    try {
      const result = await axios.post(`${host}/auth/login`, {
        email,
        password,
      });
      const service = new MapgeoService(host, result.data.token);
      return service;
    } catch (e) {
      console.log('login error: ', e);
      throw e;
    }
  }

  constructor(host: string, token: string) {
    this.host = host;
    this.token = token;
    this.#axios = axios.create({
      baseURL: host,
      // timeout: 1000,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getUploaderTokens() {
    const result = await this.#axios.get(`/api/uploader/token`);
    return result.data as UploaderTokenResult;
  }

  async deleteOptouts(datasetId: string, ids: string[]) {
    const result = await this.#axios.put(`/api/optouts/${datasetId}`, ids);
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
