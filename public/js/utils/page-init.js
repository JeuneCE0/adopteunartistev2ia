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

  // Create a post HTML element with reactions and comments
  createPostHTML(post) {
    const author = post.author || {};
    const timeAgo = this.timeAgo(post.created_at || post.createdAt);
    const imageHTML = post.image_url
      ? `<div class="post-image" style="margin-top:12px;"><img src="${post.image_url}" alt="Post image" style="width:100%;border-radius:12px;max-height:400px;object-fit:cover;"></div>`
      : '';

    const reactionCount = post.reactionCount || 0;
    const commentCount = post.commentCount || 0;
    const userReaction = post.userReaction || null;
    const likeActiveClass = userReaction ? 'active' : '';
    const likeActiveStyle = userReaction ? 'color:#615dfa;' : '';

    return `
    <div class="widget-box no-padding" data-post-id="${post.id}" style="margin-bottom:16px;">
      <div class="widget-box-status">
        <div class="widget-box-status-content" style="padding:24px;">
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
          <p class="widget-box-status-text" style="margin-top:12px;">${post.content || ''}</p>
          ${imageHTML}

          <!-- REACTIONS BAR -->
          <div class="content-actions" style="margin-top:16px;display:flex;align-items:center;gap:16px;padding-top:12px;border-top:1px solid #eaeaf5;">
            <div class="content-action" style="cursor:pointer;display:flex;align-items:center;gap:4px;" onclick="PostInteractions.react(${post.id}, this)">
              <span class="reaction-icon ${likeActiveClass}" style="font-size:16px;${likeActiveStyle}">&#x2764;</span>
              <span class="reaction-count" style="font-size:13px;color:#9aa4bf;">${reactionCount}</span>
            </div>
            <div class="content-action" style="cursor:pointer;display:flex;align-items:center;gap:4px;" onclick="PostInteractions.toggleComments(${post.id}, this)">
              <span style="font-size:16px;">&#x1F4AC;</span>
              <span class="comment-count" style="font-size:13px;color:#9aa4bf;">${commentCount}</span>
            </div>
          </div>

          <!-- COMMENTS SECTION (hidden by default) -->
          <div class="post-comments-section" id="comments-${post.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #eaeaf5;">
            <div class="comments-list" id="comments-list-${post.id}"></div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Ecrire un commentaire..." style="flex:1;padding:8px 12px;border:1px solid #dedeea;border-radius:12px;font-size:13px;outline:none;">
              <button onclick="PostInteractions.addComment(${post.id})" style="padding:8px 16px;background:#615dfa;color:#fff;border:none;border-radius:12px;font-size:13px;cursor:pointer;">Envoyer</button>
            </div>
          </div>
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
