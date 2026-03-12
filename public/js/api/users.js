/**
 * API Users Module - Adopte un Artiste
 */
const UsersAPI = {
  baseURL: '/api/users',

  async getProfile(userId) {
    return apiRequest(`${this.baseURL}/${userId}`);
  },

  async updateProfile(userId, data) {
    return apiRequest(`${this.baseURL}/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async uploadAvatar(userId, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = AuthAPI.getToken();
    const response = await fetch(`${this.baseURL}/${userId}/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async uploadCover(userId, file) {
    const formData = new FormData();
    formData.append('cover', file);
    const token = AuthAPI.getToken();
    const response = await fetch(`${this.baseURL}/${userId}/cover`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async listMembers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`${this.baseURL}?${query}`);
  }
};
