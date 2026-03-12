/**
 * API Messages Module - Adopte un Artiste
 */
const MessagesAPI = {
  baseURL: '/api/messages',

  async getConversations() {
    return apiRequest(`${this.baseURL}/conversations`);
  },

  async createConversation(userId) {
    return apiRequest(`${this.baseURL}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ userId, type: 'private' })
    });
  },

  async getMessages(conversationId, page = 1, limit = 50) {
    return apiRequest(`${this.baseURL}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  },

  async sendMessage(conversationId, content, type = 'text') {
    return apiRequest(`${this.baseURL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type })
    });
  }
};
