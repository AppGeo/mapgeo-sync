import axios, { AxiosInstance } from 'axios';

export default class MapgeoService {
  host: string;
  token: string;
  #axios: AxiosInstance;

  constructor(host: string, token: string) {
    this.host = host;
    this.token = token;
    this.#axios = axios.create({
      baseURL: host,
      // timeout: 1000,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  private createError(message: string) {
    return { ok: false, error: new Error(message) };
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
        response = this.createError('Login: Unauthorized');
        break;
      }

      case 404: {
        response = this.createError('Login: Bad Host (404)');
        break;
      }

      default: {
        response = this.createError(
          `DeleteOptouts: (${result.statusText}) ${JSON.stringify(result.data)}`
        );
      }
    }

    return response;
  }
}
