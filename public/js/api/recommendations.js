/**
 * API Recommendations Module - Adopte un Artiste
 */
const RecommendationsAPI = {
  baseURL: '/api/recommendations',

  async getArtists(limit = 10) {
    return apiRequest(`${this.baseURL}/artists?limit=${limit}`);
  },

  async getPosts(limit = 10) {
    return apiRequest(`${this.baseURL}/posts?limit=${limit}`);
  },

  async getProducts(limit = 10) {
    return apiRequest(`${this.baseURL}/products?limit=${limit}`);
  },

  async getEvents(limit = 10) {
    return apiRequest(`${this.baseURL}/events?limit=${limit}`);
  },

  async getInterests() {
    return apiRequest(`${this.baseURL}/interests`);
  },

  async setInterests(tags) {
    return apiRequest(`${this.baseURL}/interests`, {
      method: 'POST',
      body: JSON.stringify({ tags })
    });
  }
};
