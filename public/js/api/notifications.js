/**
 * API Notifications Module - Adopte un Artiste
 */
const NotificationsAPI = {
  baseURL: '/api/notifications',

  async getAll(page = 1, limit = 20) {
    return apiRequest(`${this.baseURL}?page=${page}&limit=${limit}`);
  },

  async markAsRead(notificationId) {
    return apiRequest(`${this.baseURL}/${notificationId}/read`, { method: 'PUT' });
  },

  async markAllAsRead() {
    return apiRequest(`${this.baseURL}/read-all`, { method: 'PUT' });
  }
};
