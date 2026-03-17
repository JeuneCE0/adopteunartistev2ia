/**
 * API Subscriptions Module - Adopte un Artiste
 */
const SubscriptionsAPI = {
  baseURL: '/api/subscriptions',

  async getTiers(artistId) {
    return apiRequest(`${this.baseURL}/tiers/${artistId}`);
  },

  async createTier(data) {
    return apiRequest(`${this.baseURL}/tiers`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTier(tierId, data) {
    return apiRequest(`${this.baseURL}/tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteTier(tierId) {
    return apiRequest(`${this.baseURL}/tiers/${tierId}`, { method: 'DELETE' });
  },

  async subscribe(tierId) {
    return apiRequest(`${this.baseURL}/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ tierId })
    });
  },

  async unsubscribe(artistId) {
    return apiRequest(`${this.baseURL}/unsubscribe/${artistId}`, { method: 'POST' });
  },

  async getMySubscriptions() {
    return apiRequest(`${this.baseURL}/my-subscriptions`);
  },

  async getMySupporters() {
    return apiRequest(`${this.baseURL}/my-supporters`);
  },

  async getEarnings() {
    return apiRequest(`${this.baseURL}/earnings`);
  }
};
