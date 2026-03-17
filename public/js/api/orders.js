/**
 * API Orders Module - Adopte un Artiste
 */
const OrdersAPI = {
  baseURL: '/api/orders',

  async checkout() {
    return apiRequest(this.baseURL, { method: 'POST' });
  },

  async getMyOrders(page = 1) {
    return apiRequest(`${this.baseURL}/my-orders?page=${page}`);
  },

  async getSellerOrders() {
    return apiRequest(`${this.baseURL}/seller-orders`);
  },

  async updateStatus(orderId, status) {
    return apiRequest(`${this.baseURL}/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
};
