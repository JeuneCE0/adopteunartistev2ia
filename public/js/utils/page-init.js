/**
 * Page Initialization - Adopte un Artiste
 * Common setup for all authenticated pages
 */
const PageInit = {
  user: null,

  async init() {
    if (!AuthAPI.requireAuth()) return false;

    try {
      this.user = await AuthAPI.getMe();
      this.updateNavigation();
      this.setupLogout();
      return true;
    } catch (error) {
      console.error('Page init error:', error);
      AuthAPI.removeToken();
      window.location.href = '/';
      return false;
    }
  },

  updateNavigation() {
    if (!this.user) return;

    // Update all user avatar images in navigation
    const avatarImages = document.querySelectorAll('[data-src]');
    avatarImages.forEach(el => {
      // Only update the first nav avatar (user's own)
      if (el.closest('.user-avatar') && el.closest('#navigation-widget-small, #navigation-widget')) {
        el.setAttribute('data-src', this.user.avatar_url);
      }
    });

    // Update user name in sidebar if present
    const sidebarName = document.querySelector('.navigation-widget .user-short-description-title a');
    if (sidebarName) {
      sidebarName.textContent = this.user.display_name || this.user.username;
    }

    // Update user title/tag if present
    const sidebarTag = document.querySelector('.navigation-widget .user-short-description-text a');
    if (sidebarTag) {
      sidebarTag.textContent = '@' + this.user.username;
    }

    // Update profile links
    const profileLinks = document.querySelectorAll('a[href="profile-timeline.html"]');
    profileLinks.forEach(link => {
      link.href = `profile-timeline.html?id=${this.user.id}`;
    });
  },

  setupLogout() {
    // Add logout handler to any logout buttons/links
    const logoutBtns = document.querySelectorAll('.logout-btn, [data-action="logout"]');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        AuthAPI.logout();
      });
    });
  },

  // Helper to get URL params
  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  // Helper to format relative time
  timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'a l\'instant';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'j';
    return date.toLocaleDateString('fr-FR');
  },

  // Create a post HTML element
  createPostHTML(post) {
    const author = post.author || {};
    const timeAgo = this.timeAgo(post.created_at || post.createdAt);
    const imageHTML = post.image_url
      ? `<div class="post-image" style="margin-top:12px;"><img src="${post.image_url}" alt="Post image" style="width:100%;border-radius:12px;max-height:400px;object-fit:cover;"></div>`
      : '';

    return `
    <div class="widget-box no-padding" data-post-id="${post.id}">
      <div class="widget-box-status">
        <div class="widget-box-status-content">
          <div class="user-status">
            <a class="user-status-avatar" href="profile-timeline.html?id=${author.id}">
              <div class="user-avatar small no-outline">
                <div class="user-avatar-content">
                  <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;">
                    <img src="${author.avatar_url || 'img/avatar/01.jpg'}" alt="${author.display_name}" style="width:100%;height:100%;object-fit:cover;">
                  </div>
                </div>
              </div>
            </a>
            <p class="user-status-title medium">
              <a class="bold" href="profile-timeline.html?id=${author.id}">${author.display_name || author.username}</a>
            </p>
            <p class="user-status-text small">${timeAgo}</p>
          </div>
          <p class="widget-box-status-text">${post.content || ''}</p>
          ${imageHTML}
        </div>
      </div>
    </div>`;
  },

  // Create member card HTML
  createMemberHTML(user) {
    return `
    <div class="user-preview landscape">
      <a href="profile-timeline.html?id=${user.id}">
        <figure class="user-preview-cover" style="background:url('${user.cover_url || 'img/cover/01.jpg'}') center/cover;height:80px;border-radius:12px 12px 0 0;"></figure>
      </a>
      <div class="user-preview-info" style="padding:12px;text-align:center;">
        <a href="profile-timeline.html?id=${user.id}">
          <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;margin:-42px auto 8px;border:3px solid #fff;">
            <img src="${user.avatar_url || 'img/avatar/01.jpg'}" alt="${user.display_name}" style="width:100%;height:100%;object-fit:cover;">
          </div>
        </a>
        <a href="profile-timeline.html?id=${user.id}">
          <p class="user-preview-title" style="font-weight:700;font-size:14px;">${user.display_name || user.username}</p>
        </a>
        <p class="user-preview-text" style="font-size:12px;color:#9aa4bf;">@${user.username}</p>
        ${user.role === 'artist' ? '<span style="background:#615dfa;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;margin-top:4px;display:inline-block;">Artiste</span>' : ''}
      </div>
    </div>`;
  }
};
