/**
 * API Badges Module - Adopte un Artiste
 */
const BadgesAPI = {
  baseURL: '/api/badges',

  async list() {
    return apiRequest(this.baseURL);
  },

  async getUserBadges(userId) {
    return apiRequest(`${this.baseURL}/user/${userId}`);
  }
};
