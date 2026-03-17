/**
 * API Forums Module - Adopte un Artiste
 */
const ForumsAPI = {
  baseURL: '/api/forums',

  async getCategories() {
    return apiRequest(`${this.baseURL}/categories`);
  },

  async createCategory(name, description) {
    return apiRequest(`${this.baseURL}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  },

  async getThreads(categoryId, page = 1, limit = 20) {
    return apiRequest(`${this.baseURL}/categories/${categoryId}/threads?page=${page}&limit=${limit}`);
  },

  async getUserThreads(userId, page = 1, limit = 20) {
    return apiRequest(`${this.baseURL}/user/${userId}/threads?page=${page}&limit=${limit}`);
  },

  async getThread(threadId, page = 1) {
    return apiRequest(`${this.baseURL}/threads/${threadId}?page=${page}`);
  },

  async createThread(categoryId, title, content) {
    return apiRequest(`${this.baseURL}/categories/${categoryId}/threads`, {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
  },

  async reply(threadId, content) {
    return apiRequest(`${this.baseURL}/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  async deleteThread(threadId) {
    return apiRequest(`${this.baseURL}/threads/${threadId}`, { method: 'DELETE' });
  },

  async deleteReply(replyId) {
    return apiRequest(`${this.baseURL}/replies/${replyId}`, { method: 'DELETE' });
  }
};
