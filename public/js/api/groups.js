/**
 * API Groups Module - Adopte un Artiste
 */
const GroupsAPI = {
  baseURL: '/api/groups',

  async list(page = 1, limit = 12, search = '') {
    let url = `${this.baseURL}?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return apiRequest(url);
  },

  async get(groupId) {
    return apiRequest(`${this.baseURL}/${groupId}`);
  },

  async create(name, description, type) {
    return apiRequest(this.baseURL, {
      method: 'POST',
      body: JSON.stringify({ name, description, type })
    });
  },

  async update(groupId, data) {
    return apiRequest(`${this.baseURL}/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(groupId) {
    return apiRequest(`${this.baseURL}/${groupId}`, { method: 'DELETE' });
  },

  async join(groupId) {
    return apiRequest(`${this.baseURL}/${groupId}/join`, { method: 'POST' });
  },

  async leave(groupId) {
    return apiRequest(`${this.baseURL}/${groupId}/leave`, { method: 'POST' });
  },

  async getMembers(groupId) {
    return apiRequest(`${this.baseURL}/${groupId}/members`);
  }
};
