/**
 * API Auth Module - Adopte un Artiste
 * Handles login, register, logout, and token management
 */
const AuthAPI = {
  baseURL: '/api/auth',

  getToken() {
    return localStorage.getItem('auth_token');
  },

  setToken(token) {
    localStorage.setItem('auth_token', token);
  },

  removeToken() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  },

  getUser() {
    const user = localStorage.getItem('current_user');
    return user ? JSON.parse(user) : null;
  },

  setUser(user) {
    localStorage.setItem('current_user', JSON.stringify(user));
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async request(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur serveur');
      }

      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Impossible de se connecter au serveur');
      }
      throw error;
    }
  },

  async login(login, password) {
    const data = await this.request(`${this.baseURL}/login`, {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });

    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async register(username, email, password) {
    const data = await this.request(`${this.baseURL}/register`, {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });

    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async logout() {
    try {
      await this.request(`${this.baseURL}/logout`, { method: 'POST' });
    } catch (e) {
      // Ignore errors on logout
    }
    this.removeToken();
    window.location.href = '/';
  },

  async getMe() {
    const data = await this.request(`${this.baseURL}/me`);
    this.setUser(data.user);
    return data.user;
  },

  // Redirect to overview if already logged in
  checkAuth() {
    if (this.isLoggedIn()) {
      window.location.href = '/newsfeed.html';
      return true;
    }
    return false;
  },

  // Redirect to login if not logged in (use on protected pages)
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/';
      return false;
    }
    return true;
  }
};

// Global helper for API calls with auth
async function apiRequest(url, options = {}) {
  return AuthAPI.request(url, options);
}
