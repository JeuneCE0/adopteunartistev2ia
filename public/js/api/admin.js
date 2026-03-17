/**
 * API Admin Module - Adopte un Artiste
 * Admin dashboard API calls
 */
const AdminAPI = {
  baseURL: '/api/admin',

  async getStats() {
    return apiRequest(this.baseURL + '/stats');
  },

  async getUsers(page, limit, search, role, sort) {
    var params = '?page=' + (page || 1) + '&limit=' + (limit || 20);
    if (search) params += '&search=' + encodeURIComponent(search);
    if (role) params += '&role=' + role;
    if (sort) params += '&sort=' + sort;
    return apiRequest(this.baseURL + '/users' + params);
  },

  async updateUser(id, data) {
    return apiRequest(this.baseURL + '/users/' + id, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteUser(id) {
    return apiRequest(this.baseURL + '/users/' + id, { method: 'DELETE' });
  },

  async getPosts(page, limit, search) {
    var params = '?page=' + (page || 1) + '&limit=' + (limit || 20);
    if (search) params += '&search=' + encodeURIComponent(search);
    return apiRequest(this.baseURL + '/posts' + params);
  },

  async deletePost(id) {
    return apiRequest(this.baseURL + '/posts/' + id, { method: 'DELETE' });
  },

  async getProducts(page, limit) {
    var params = '?page=' + (page || 1) + '&limit=' + (limit || 20);
    return apiRequest(this.baseURL + '/products' + params);
  },

  async deleteProduct(id) {
    return apiRequest(this.baseURL + '/products/' + id, { method: 'DELETE' });
  },

  async getOrders(page, limit, status) {
    var params = '?page=' + (page || 1) + '&limit=' + (limit || 20);
    if (status) params += '&status=' + status;
    return apiRequest(this.baseURL + '/orders' + params);
  }
};
