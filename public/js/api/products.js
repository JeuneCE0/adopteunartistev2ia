/**
 * API Products Module - Adopte un Artiste
 */
const ProductsAPI = {
  baseURL: '/api/products',

  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${this.baseURL}?${qs}`);
  },

  async get(productId) {
    return apiRequest(`${this.baseURL}/${productId}`);
  },

  async create(formData) {
    const token = AuthAPI.getToken();
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async update(productId, data) {
    return apiRequest(`${this.baseURL}/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(productId) {
    return apiRequest(`${this.baseURL}/${productId}`, { method: 'DELETE' });
  },

  async getMyProducts() {
    return apiRequest(`${this.baseURL}/seller/my-products`);
  },

  async addReview(productId, rating, content) {
    return apiRequest(`${this.baseURL}/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, content })
    });
  },

  // Cart
  async getCart() {
    return apiRequest(`${this.baseURL}/cart/items`);
  },

  async addToCart(productId, quantity = 1) {
    return apiRequest(`${this.baseURL}/cart/add`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
  },

  async removeFromCart(itemId) {
    return apiRequest(`${this.baseURL}/cart/${itemId}`, { method: 'DELETE' });
  }
};
