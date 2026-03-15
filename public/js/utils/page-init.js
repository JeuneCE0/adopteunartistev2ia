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
      this.setupSearch();
      this.initToastContainer();
      this.markActiveNavLink();
      this.checkOnboarding();
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
      if (el.closest('.user-avatar') && el.closest('#navigation-widget-small, #navigation-widget, #navigation-widget-mobile')) {
        el.setAttribute('data-src', this.user.avatar_url || 'img/avatar/01.jpg');
      }
    });

    // Update cover image in sidebar
    const coverImgs = document.querySelectorAll('.navigation-widget-cover img');
    coverImgs.forEach(img => {
      img.src = this.user.cover_url || 'img/cover/01.jpg';
    });

    // Update user name in large sidebar
    const sidebarName = document.querySelector('#navigation-widget .user-short-description-title a');
    if (sidebarName) {
      sidebarName.textContent = this.user.display_name || this.user.username;
    }

    // Update user tag in large sidebar
    const sidebarTag = document.querySelector('#navigation-widget .user-short-description-text a');
    if (sidebarTag) {
      sidebarTag.textContent = '@' + this.user.username;
    }

    // Update mobile nav name
    const mobileTitle = document.querySelector('#navigation-widget-mobile .navigation-widget-info-title a');
    if (mobileTitle) {
      mobileTitle.textContent = this.user.display_name || this.user.username;
    }

    // Update mobile nav welcome text
    const mobileText = document.querySelector('#navigation-widget-mobile .navigation-widget-info-text');
    if (mobileText) {
      mobileText.textContent = 'Niveau ' + (this.user.level || 1);
    }

    // Update user level badge text
    const badgeTexts = document.querySelectorAll('.user-avatar-badge-text');
    badgeTexts.forEach(el => {
      el.textContent = this.user.level || 1;
    });

    // Update user stats in sidebar
    const statTitles = document.querySelectorAll('#navigation-widget .user-stat-title');
    if (statTitles.length >= 3) {
      statTitles[0].textContent = this.user.postCount || '0';
      statTitles[1].textContent = this.user.friendCount || '0';
      statTitles[2].textContent = (this.user.xp || 0) + ' XP';
    }
    // Update stat labels
    const statTexts = document.querySelectorAll('#navigation-widget .user-stat-text');
    if (statTexts.length >= 3) {
      statTexts[2].textContent = 'exp.';
    }

    // Update profile links
    const profileLinks = document.querySelectorAll('a[href="profile-timeline.html"]');
    profileLinks.forEach(link => {
      link.href = `profile-timeline.html?id=${this.user.id}`;
    });

    // Setup logout on mobile nav button
    const mobileLogout = document.querySelector('#navigation-widget-mobile .navigation-widget-info-button');
    if (mobileLogout) {
      mobileLogout.addEventListener('click', (e) => {
        e.preventDefault();
        AuthAPI.logout();
      });
    }

    // Load notification count
    this.loadNotificationCount();
    // Load user stats (posts, friends)
    this.loadUserStats();
  },

  async loadNotificationCount() {
    try {
      const data = await apiRequest('/api/notifications?limit=1');
      const count = data.unreadCount || 0;
      const badges = document.querySelectorAll('.action-list-item-icon .action-list-item-icon-count, .header-settings-text');
      badges.forEach(el => {
        if (count > 0) {
          el.textContent = count > 99 ? '99+' : count;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    } catch (e) {
      // Silently ignore notification count errors
    }
  },

  async loadUserStats() {
    try {
      const [postsData, friendsData] = await Promise.all([
        apiRequest(`/api/posts/user/${this.user.id}?page=1&limit=1`).catch(() => ({ count: 0 })),
        apiRequest('/api/friends?page=1&limit=1').catch(() => ({ count: 0 }))
      ]);
      const postCount = postsData.count || 0;
      const friendCount = friendsData.count || 0;

      const statTitles = document.querySelectorAll('#navigation-widget .user-stat-title');
      if (statTitles.length >= 2) {
        statTitles[0].textContent = postCount;
        statTitles[1].textContent = friendCount;
      }
    } catch (e) {
      // Silently ignore stats errors
    }
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

  // Load profile header for profile-* pages
  async loadProfileHeader(userId) {
    try {
      var profile = await UsersAPI.getProfile(userId);

      // Update profile header name
      var titles = document.querySelectorAll('.profile-header-info .user-short-description-title a');
      titles.forEach(function(el) { el.textContent = profile.display_name || profile.username; });

      // Update profile header text
      var texts = document.querySelectorAll('.profile-header-info .user-short-description-text a');
      texts.forEach(function(el) { el.textContent = '@' + profile.username; });

      // Update level badge
      var badges = document.querySelectorAll('.profile-header .user-avatar-badge-text');
      badges.forEach(function(el) { el.textContent = profile.level || 1; });

      // Update cover image
      if (profile.cover_url) {
        var cover = document.querySelector('.profile-header-cover img');
        if (cover) cover.src = profile.cover_url;
      }

      // Update avatar data-src
      if (profile.avatar_url) {
        var avatars = document.querySelectorAll('.profile-header .hexagon-image-100-110, .profile-header .hexagon-image-82-90');
        avatars.forEach(function(el) { el.setAttribute('data-src', profile.avatar_url); });
      }

      // Update profile stats
      var statTitles = document.querySelectorAll('.profile-header .user-stat-title');
      if (statTitles.length >= 2) {
        statTitles[0].textContent = profile.postCount || 0;
        statTitles[1].textContent = profile.friendCount || 0;
      }

      // Update nav links to include user id
      var profileLinks = document.querySelectorAll('.profile-header a.profile-header-stat-link, .section-navigation a');
      profileLinks.forEach(function(link) {
        var href = link.getAttribute('href');
        if (href && href.indexOf('profile-') === 0 && href.indexOf('?') === -1) {
          link.href = href + '?id=' + userId;
        }
      });

      // Wire profile action buttons (Add Friend / Send Message)
      this.wireProfileActions(userId, profile);

      return profile;
    } catch(e) {
      console.error('Profile header load error:', e);
      return null;
    }
  },

  // Wire Add Friend + Send Message buttons on profile pages
  wireProfileActions(userId, profile) {
    var self = this;
    var isOwn = String(userId) === String(this.user.id);
    var actionsEl = document.getElementById('profile-actions');
    var addFriendBtn = document.getElementById('btn-add-friend');
    var sendMsgBtn = document.getElementById('btn-send-message');

    if (!actionsEl || isOwn) return;
    actionsEl.style.display = '';

    // Check existing friendship
    if (addFriendBtn && typeof FriendsAPI !== 'undefined') {
      FriendsAPI.getMyFriends(1, 200).then(function(data) {
        var friends = data.friends || [];
        var isFriend = friends.some(function(f) {
          var u = f.friend || f.user || f;
          return String(u.id) === String(userId);
        });
        if (isFriend) {
          addFriendBtn.innerHTML = '<span class="hide-text-mobile">&#x2714;</span> Ami';
          addFriendBtn.classList.replace('secondary', 'primary');
          addFriendBtn.style.opacity = '0.7';
          addFriendBtn.style.pointerEvents = 'none';
        }
      }).catch(function() {});

      addFriendBtn.addEventListener('click', async function() {
        if (this.style.pointerEvents === 'none') return;
        this.style.pointerEvents = 'none';
        this.textContent = 'Envoi...';
        try {
          await FriendsAPI.sendRequest(userId);
          this.textContent = 'Demande envoyee';
          this.classList.replace('secondary', 'primary');
          self.toast('Demande d\'ami envoyee !', 'success');
        } catch(err) {
          var msg = err.message || '';
          if (msg.indexOf('deja') > -1 || msg.indexOf('already') > -1 || msg.indexOf('existe') > -1) {
            this.textContent = 'Deja envoye';
          } else {
            this.innerHTML = '<span class="hide-text-mobile">Ajouter</span> Ami +';
            this.style.pointerEvents = '';
            self.toast(msg || 'Erreur', 'error');
          }
        }
      });
    }

    // Send message
    if (sendMsgBtn && typeof MessagesAPI !== 'undefined') {
      sendMsgBtn.addEventListener('click', async function() {
        this.textContent = 'Ouverture...';
        try {
          var data = await MessagesAPI.createConversation(userId);
          var convId = data.conversation ? data.conversation.id : data.id;
          window.location.href = 'hub-profile-messages.html?conv=' + convId;
        } catch(err) {
          self.toast(err.message || 'Erreur', 'error');
          this.innerHTML = '<span class="hide-text-mobile">Envoyer</span> Message';
        }
      });
    }
  },

  // Load group header for group-* pages
  async loadGroupHeader(groupId) {
    try {
      var group = await GroupsAPI.get(groupId);
      var g = group.group || group;

      // Update group name
      var titles = document.querySelectorAll('.profile-header-info .user-short-description-title a, .profile-header-info .user-short-description-title');
      titles.forEach(function(el) {
        if (el.tagName === 'A') el.textContent = g.name;
        else if (!el.querySelector('a')) el.textContent = g.name;
      });

      // Update group description
      var texts = document.querySelectorAll('.profile-header-info .user-short-description-text');
      texts.forEach(function(el) { el.textContent = g.description || g.type || 'Groupe'; });

      // Update cover image
      if (g.cover_url) {
        var cover = document.querySelector('.profile-header-cover img');
        if (cover) cover.src = g.cover_url;
      }

      // Update avatar
      if (g.avatar_url) {
        var avatars = document.querySelectorAll('.profile-header .hexagon-image-100-110, .profile-header .hexagon-image-82-90, .profile-header .hexagon-image-124-136');
        avatars.forEach(function(el) { el.setAttribute('data-src', g.avatar_url); });
      }

      // Update member count stat
      var statTitles = document.querySelectorAll('.profile-header .user-stat-title');
      if (statTitles.length >= 1) {
        statTitles[0].textContent = g.memberCount || 0;
      }

      return g;
    } catch(e) {
      console.error('Group header load error:', e);
      return null;
    }
  },

  // Create group card HTML
  createGroupCardHTML(group) {
    return '<div class="user-preview">' +
      '<a href="group-timeline.html?id=' + group.id + '">' +
      '<figure class="user-preview-cover" style="background:url(\'' + (group.cover_url || 'img/cover/29.jpg') + '\') center/cover;height:80px;border-radius:12px 12px 0 0;"></figure>' +
      '</a>' +
      '<div class="user-preview-info" style="padding:12px;text-align:center;">' +
        '<a href="group-timeline.html?id=' + group.id + '">' +
          '<div style="width:60px;height:60px;border-radius:50%;overflow:hidden;margin:-42px auto 8px;border:3px solid #fff;background:#f5f5fa;">' +
            '<img src="' + (group.avatar_url || 'img/avatar/01.jpg') + '" style="width:100%;height:100%;object-fit:cover;">' +
          '</div>' +
        '</a>' +
        '<a href="group-timeline.html?id=' + group.id + '">' +
          '<p style="font-weight:700;font-size:14px;">' + group.name + '</p>' +
        '</a>' +
        '<p style="font-size:12px;color:#9aa4bf;">' + (group.type || 'public') + '</p>' +
        '<p style="font-size:12px;color:#9aa4bf;margin-top:4px;">' + (group.memberCount || 0) + ' membres</p>' +
      '</div>' +
    '</div>';
  },

  // Create photo card HTML
  createPhotoHTML(post) {
    return '<div class="photo-preview">' +
      '<figure class="photo-preview-image liquid">' +
        '<img src="' + post.image_url + '" alt="photo" style="width:100%;height:200px;object-fit:cover;border-radius:12px;">' +
      '</figure>' +
      '<div class="photo-preview-info" style="padding:8px;">' +
        '<p style="font-size:12px;color:#9aa4bf;">' + this.timeAgo(post.created_at || post.createdAt) + '</p>' +
      '</div>' +
    '</div>';
  },

  // Create friend request HTML
  createRequestHTML(request) {
    var user = request.requester || request.sender || request;
    return '<div class="notification-box" data-request-id="' + request.id + '">' +
      '<div class="user-status request">' +
        '<a class="user-status-avatar" href="profile-timeline.html?id=' + user.id + '">' +
          '<div class="user-avatar small no-outline"><div class="user-avatar-content">' +
            '<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;">' +
              '<img src="' + (user.avatar_url || 'img/avatar/01.jpg') + '" style="width:100%;height:100%;object-fit:cover;">' +
            '</div>' +
          '</div></div>' +
        '</a>' +
        '<p class="user-status-title"><a class="bold" href="profile-timeline.html?id=' + user.id + '">' + (user.display_name || user.username) + '</a></p>' +
        '<p class="user-status-text small-space">Demande d\'ami</p>' +
        '<div class="action-request-list">' +
          '<div class="action-request accept" style="cursor:pointer;" data-request-id="' + request.id + '">' +
            '<svg class="action-request-icon icon-add-friend"><use xlink:href="#svg-add-friend"></use></svg>' +
          '</div>' +
          '<div class="action-request decline" style="cursor:pointer;" data-request-id="' + request.id + '">' +
            '<svg class="action-request-icon icon-remove-friend"><use xlink:href="#svg-remove-friend"></use></svg>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  },

  // Create member card HTML
  createMemberHTML(user) {
    return `
    <div class="user-preview landscape aua-fade-in">
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
  },

  // ===== LOADING SPINNER =====
  showLoading(container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.innerHTML = '<div class="aua-loading"><div class="aua-spinner"></div></div>';
  },

  hideLoading(container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    var spinner = container.querySelector('.aua-loading');
    if (spinner) spinner.remove();
  },

  // ===== EMPTY STATE =====
  showEmpty(container, icon, title, text, buttonText, buttonHref) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    var html = '<div class="aua-empty-state aua-fade-in">';
    if (icon) html += '<div class="aua-empty-icon">' + icon + '</div>';
    if (title) html += '<p class="aua-empty-title">' + title + '</p>';
    if (text) html += '<p class="aua-empty-text">' + text + '</p>';
    if (buttonText && buttonHref) {
      html += '<a href="' + buttonHref + '" class="button small secondary">' + buttonText + '</a>';
    }
    html += '</div>';
    container.innerHTML = html;
  },

  // ===== TOAST NOTIFICATIONS =====
  initToastContainer() {
    if (!document.querySelector('.aua-toast-container')) {
      var div = document.createElement('div');
      div.className = 'aua-toast-container';
      document.body.appendChild(div);
    }
  },

  toast(message, type) {
    type = type || 'info';
    var container = document.querySelector('.aua-toast-container');
    if (!container) {
      this.initToastContainer();
      container = document.querySelector('.aua-toast-container');
    }
    var toast = document.createElement('div');
    toast.className = 'aua-toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('out');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3500);
  },

  // ===== SEARCH SETUP =====
  setupSearch() {
    var searchInputs = document.querySelectorAll('.interactive-input input[type="text"], .header-search-input');
    searchInputs.forEach(function(input) {
      if (input.dataset.searchWired) return;
      input.dataset.searchWired = 'true';
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var query = this.value.trim();
          if (query) {
            window.location.href = 'members.html?search=' + encodeURIComponent(query);
          }
        }
      });
    });
  },

  // ===== ACTIVE NAV LINK =====
  markActiveNavLink() {
    var currentPage = window.location.pathname.split('/').pop() || 'newsfeed.html';
    // Remove query string for matching
    currentPage = currentPage.split('?')[0];

    // Map pages to nav categories
    var navMap = {
      'newsfeed.html': 'Newsfeed',
      'overview.html': 'Overview',
      'members.html': 'Members',
      'groups.html': 'Groups',
      'badges.html': 'Badges',
      'quests.html': 'Quests',
      'streams.html': 'Streams',
      'events.html': 'Events',
      'events-daily.html': 'Events',
      'events-weekly.html': 'Events',
      'forums.html': 'Forums',
      'forums-category.html': 'Forums',
      'forums-discussion.html': 'Forums',
      'marketplace.html': 'Marketplace',
      'marketplace-category.html': 'Marketplace',
      'marketplace-product.html': 'Marketplace',
      'marketplace-cart.html': 'Marketplace',
      'marketplace-checkout.html': 'Marketplace'
    };

    var navLabel = navMap[currentPage];
    if (!navLabel) return;

    // Highlight in sidebar
    var sidebarLinks = document.querySelectorAll('.navigation-widget-section-link, .menu-item-link');
    sidebarLinks.forEach(function(link) {
      if (link.textContent.trim() === navLabel) {
        link.classList.add('active');
      }
    });
  },

  // ===== XP BAR HTML =====
  createXpBarHTML(currentXp, nextLevelXp) {
    var pct = nextLevelXp > 0 ? Math.min(100, Math.round((currentXp / nextLevelXp) * 100)) : 0;
    return '<div class="aua-xp-bar"><div class="aua-xp-bar-fill" style="width:' + pct + '%;"></div></div>' +
      '<p style="font-size:11px;color:#9aa4bf;margin-top:4px;">' + currentXp + ' / ' + nextLevelXp + ' XP</p>';
  },

  // ===== ONBOARDING =====
  checkOnboarding() {
    if (localStorage.getItem('aua_onboarding') !== '1') return;
    localStorage.removeItem('aua_onboarding');
    var self = this;
    var name = this.user.display_name || this.user.username;

    var overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;justify-content:center;align-items:center;';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:20px;padding:40px;max-width:520px;width:90%;text-align:center;animation:fadeInUp 0.4s ease;">' +
        '<div style="font-size:48px;margin-bottom:16px;">&#x1F3A8;</div>' +
        '<h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">Bienvenue sur Adopte un Artiste !</h2>' +
        '<p style="color:#9aa4bf;font-size:14px;margin-bottom:24px;">Salut <strong>' + name + '</strong>, on est ravis de t\'accueillir dans la communaute. Voici comment bien demarrer :</p>' +
        '<div style="text-align:left;margin-bottom:24px;">' +
          '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">' +
            '<span style="background:#615dfa;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">1</span>' +
            '<div><p style="font-weight:700;font-size:14px;">Complete ton profil</p><p style="color:#9aa4bf;font-size:12px;">Ajoute un avatar, une bio et tes liens sociaux</p></div>' +
          '</div>' +
          '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">' +
            '<span style="background:#615dfa;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">2</span>' +
            '<div><p style="font-weight:700;font-size:14px;">Decouvre la communaute</p><p style="color:#9aa4bf;font-size:12px;">Parcours les membres, rejoins des groupes et connecte-toi</p></div>' +
          '</div>' +
          '<div style="display:flex;align-items:flex-start;gap:12px;">' +
            '<span style="background:#615dfa;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">3</span>' +
            '<div><p style="font-weight:700;font-size:14px;">Publie et partage</p><p style="color:#9aa4bf;font-size:12px;">Poste tes creations, vends tes services sur la marketplace</p></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
          '<a href="hub-profile-info.html" class="button secondary" style="font-size:13px;">Completer mon profil</a>' +
          '<button id="onboarding-start" class="button primary" style="font-size:13px;">C\'est parti !</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('onboarding-start').addEventListener('click', function() {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(function() { overlay.remove(); }, 300);
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        setTimeout(function() { overlay.remove(); }, 300);
      }
    });
  },

  // ===== SKELETON LOADING =====
  showSkeleton(container, count) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="widget-box no-padding" style="margin-bottom:16px;padding:24px;">' +
        '<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">' +
          '<div class="aua-skeleton aua-skeleton-avatar"></div>' +
          '<div style="flex:1;"><div class="aua-skeleton aua-skeleton-text short"></div><div class="aua-skeleton aua-skeleton-text" style="width:40%;"></div></div>' +
        '</div>' +
        '<div class="aua-skeleton aua-skeleton-text"></div>' +
        '<div class="aua-skeleton aua-skeleton-text short"></div>' +
      '</div>';
    }
    container.innerHTML = html;
  }
};
