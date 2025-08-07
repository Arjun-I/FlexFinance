class ApiClient {
    constructor({ baseUrl = '', headers = {}, retries = 0, fetchFn = global.fetch } = {}) {
      this.baseUrl = baseUrl.replace(/\/$/, '');
      this.headers = headers;
      this.retries = retries;
      this.fetch = fetchFn;
    }
  
    async request(path, options = {}, attempt = 0) {
      const url = this.baseUrl
        ? `${this.baseUrl}/${path}`.replace(/([^:]\/)\/+/g, '$1')
        : path;
      const mergedHeaders = { ...this.headers, ...(options.headers || {}) };
      try {
        const res = await this.fetch(url, { ...options, headers: mergedHeaders });
        if (!res.ok) {
          const text = res.text ? await res.text().catch(() => '') : '';
          const err = new Error(text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`);
          err.status = res.status;
          throw err;
        }
        return res;
      } catch (err) {
        if (attempt < this.retries) {
          return this.request(path, options, attempt + 1);
        }
        throw this.translateError(err);
      }
    }
  
    translateError(err) {
      if (err && err.message && err.message.toLowerCase().includes('fetch')) {
        return new Error('Network error');
      }
      return err;
    }
  }
  
  module.exports = ApiClient;
  module.exports.default = ApiClient;