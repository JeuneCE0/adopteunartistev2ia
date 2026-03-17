/**
 * API Streams Module - Adopte un Artiste
 */
const StreamsAPI = {
  baseURL: '/api/streams',

  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${this.baseURL}?${qs}`);
  },

  async get(streamId) {
    return apiRequest(`${this.baseURL}/${streamId}`);
  },

  async create(data) {
    return apiRequest(this.baseURL, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async start(streamId) {
    return apiRequest(`${this.baseURL}/${streamId}/start`, { method: 'PUT' });
  },

  async end(streamId) {
    return apiRequest(`${this.baseURL}/${streamId}/end`, { method: 'PUT' });
  },

  async delete(streamId) {
    return apiRequest(`${this.baseURL}/${streamId}`, { method: 'DELETE' });
  }
};
