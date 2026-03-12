/**
 * API Events Module - Adopte un Artiste
 */
const EventsAPI = {
  baseURL: '/api/events',

  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${this.baseURL}?${qs}`);
  },

  async get(eventId) {
    return apiRequest(`${this.baseURL}/${eventId}`);
  },

  async create(data) {
    return apiRequest(this.baseURL, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(eventId, data) {
    return apiRequest(`${this.baseURL}/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(eventId) {
    return apiRequest(`${this.baseURL}/${eventId}`, { method: 'DELETE' });
  },

  async rsvp(eventId, status) {
    return apiRequest(`${this.baseURL}/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }
};
