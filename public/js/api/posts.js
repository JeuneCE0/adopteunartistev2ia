/**
 * API Posts Module - Adopte un Artiste
 */
const PostsAPI = {
  baseURL: '/api/posts',

  async create(content, visibility, imageFile) {
    if (imageFile) {
      const formData = new FormData();
      formData.append('content', content || '');
      formData.append('visibility', visibility || 'public');
      formData.append('image', imageFile);
      const token = AuthAPI.getToken();
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    }

    return apiRequest(this.baseURL, {
      method: 'POST',
      body: JSON.stringify({ content, visibility })
    });
  },

  async getFeed(page = 1, limit = 10) {
    return apiRequest(`${this.baseURL}/feed?page=${page}&limit=${limit}`);
  },

  async getUserPosts(userId, page = 1, limit = 10) {
    return apiRequest(`${this.baseURL}/user/${userId}?page=${page}&limit=${limit}`);
  },

  async getPost(postId) {
    return apiRequest(`${this.baseURL}/${postId}`);
  },

  async update(postId, content, visibility) {
    return apiRequest(`${this.baseURL}/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({ content, visibility })
    });
  },

  async delete(postId) {
    return apiRequest(`${this.baseURL}/${postId}`, { method: 'DELETE' });
  }
};
