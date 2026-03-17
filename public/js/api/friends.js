/**
 * API Friends Module - Adopte un Artiste
 */
const FriendsAPI = {
  baseURL: '/api/friends',

  async getMyFriends(page = 1, limit = 12) {
    return apiRequest(`${this.baseURL}?page=${page}&limit=${limit}`);
  },

  async getUserFriends(userId, page = 1, limit = 12) {
    return apiRequest(`${this.baseURL}/user/${userId}?page=${page}&limit=${limit}`);
  },

  async getRequests() {
    return apiRequest(`${this.baseURL}/requests`);
  },

  async sendRequest(userId) {
    return apiRequest(`${this.baseURL}/request/${userId}`, { method: 'POST' });
  },

  async accept(requestId) {
    return apiRequest(`${this.baseURL}/accept/${requestId}`, { method: 'PUT' });
  },

  async reject(requestId) {
    return apiRequest(`${this.baseURL}/reject/${requestId}`, { method: 'PUT' });
  },

  async remove(userId) {
    return apiRequest(`${this.baseURL}/${userId}`, { method: 'DELETE' });
  }
};
