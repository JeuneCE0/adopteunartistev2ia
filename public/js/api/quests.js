/**
 * API Quests Module - Adopte un Artiste
 */
const QuestsAPI = {
  baseURL: '/api/quests',

  async list() {
    return apiRequest(this.baseURL);
  },

  async getMyQuests() {
    return apiRequest(`${this.baseURL}/my-quests`);
  },

  async start(questId) {
    return apiRequest(`${this.baseURL}/${questId}/start`, { method: 'POST' });
  }
};
