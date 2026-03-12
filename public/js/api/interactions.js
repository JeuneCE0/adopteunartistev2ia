/**
 * Post Interactions - Reactions & Comments
 */
const PostInteractions = {
  async react(postId, element) {
    try {
      const data = await apiRequest(`/api/posts/${postId}/react`, {
        method: 'POST',
        body: JSON.stringify({ type: 'like' })
      });

      const countEl = element.querySelector('.reaction-count');
      const iconEl = element.querySelector('.reaction-icon');

      if (data.removed) {
        countEl.textContent = data.counts.total || 0;
        iconEl.style.color = '';
        iconEl.classList.remove('active');
      } else {
        countEl.textContent = data.counts.total || 0;
        iconEl.style.color = '#615dfa';
        iconEl.classList.add('active');
      }
    } catch (error) {
      console.error('React error:', error);
    }
  },

  async toggleComments(postId, element) {
    const section = document.getElementById('comments-' + postId);
    if (!section) return;

    if (section.style.display === 'none') {
      section.style.display = 'block';
      await this.loadComments(postId);
    } else {
      section.style.display = 'none';
    }
  },

  async loadComments(postId) {
    try {
      const data = await apiRequest(`/api/posts/${postId}/comments`);
      const list = document.getElementById('comments-list-' + postId);
      if (!list) return;

      list.innerHTML = '';
      if (data.comments.length === 0) {
        list.innerHTML = '<p style="font-size:12px;color:#9aa4bf;padding:8px 0;">Aucun commentaire</p>';
        return;
      }

      data.comments.forEach(function(comment) {
        list.insertAdjacentHTML('beforeend', PostInteractions.createCommentHTML(comment));

        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach(function(reply) {
            list.insertAdjacentHTML('beforeend', PostInteractions.createCommentHTML(reply, true));
          });
        }
      });
    } catch (error) {
      console.error('Load comments error:', error);
    }
  },

  async addComment(postId) {
    var input = document.getElementById('comment-input-' + postId);
    if (!input) return;

    var content = input.value.trim();
    if (!content) return;

    try {
      var data = await apiRequest('/api/posts/' + postId + '/comments', {
        method: 'POST',
        body: JSON.stringify({ content: content })
      });

      input.value = '';

      var list = document.getElementById('comments-list-' + postId);
      if (list) {
        var noComments = list.querySelector('p');
        if (noComments && noComments.textContent === 'Aucun commentaire') {
          list.innerHTML = '';
        }
        list.insertAdjacentHTML('beforeend', PostInteractions.createCommentHTML(data.comment));
      }

      // Update comment count
      var postEl = document.querySelector('[data-post-id="' + postId + '"]');
      if (postEl) {
        var countEl = postEl.querySelector('.comment-count');
        if (countEl) {
          countEl.textContent = parseInt(countEl.textContent || 0) + 1;
        }
      }
    } catch (error) {
      console.error('Add comment error:', error);
    }
  },

  createCommentHTML(comment, isReply) {
    var author = comment.author || {};
    var indent = isReply ? 'margin-left:32px;' : '';

    return '<div style="display:flex;gap:8px;padding:6px 0;' + indent + '">' +
      '<div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;">' +
        '<img src="' + (author.avatar_url || 'img/avatar/01.jpg') + '" style="width:100%;height:100%;object-fit:cover;">' +
      '</div>' +
      '<div style="background:#f5f5fa;padding:8px 12px;border-radius:12px;flex:1;">' +
        '<a href="profile-timeline.html?id=' + author.id + '" style="font-size:12px;font-weight:700;color:#3e3f5e;">' +
          (author.display_name || author.username || '') +
        '</a>' +
        '<p style="font-size:13px;color:#3e3f5e;margin-top:2px;">' + (comment.content || '') + '</p>' +
      '</div>' +
    '</div>';
  }
};
