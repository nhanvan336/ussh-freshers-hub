// ===================================
// Forum JavaScript
// ===================================

let currentCategory = 'all';
let currentSort = 'newest';
let currentFilter = 'all';
let isLoading = false;
let hasMorePosts = true;
let socket;

// Initialize Forum
function initializeForum() {
    setupCategoryFilters();
    setupSearch();
    setupSorting();
    setupPostFilters();
    setupCreatePostModal();
    setupPostActions();
    setupRealTimeUpdates();
    loadPosts();
}

// ===================================
// Real-time Updates with Socket.io
// ===================================
function setupRealTimeUpdates() {
    if (typeof io !== 'undefined') {
        socket = io();
        
        // Join forum room for real-time updates
        socket.emit('join-forum', 'general');
        
        // Listen for new posts
        socket.on('newPost', function(post) {
            prependNewPost(post);
            showNotification('Có bài viết mới được đăng!', 'info');
        });
        
        // Listen for post updates
        socket.on('postUpdated', function(data) {
            updatePostInDOM(data.postId, data.updates);
        });
        
        // Listen for new comments
        socket.on('newComment', function(data) {
            addCommentToPost(data.postId, data.comment);
        });
    }
}

function prependNewPost(post) {
    const postsList = document.getElementById('postsList');
    if (postsList && currentSort === 'newest') {
        const postHTML = createPostCard(post);
        postsList.insertAdjacentHTML('afterbegin', postHTML);
        
        // Animate the new post
        const newPostElement = postsList.firstElementChild;
        newPostElement.style.opacity = '0';
        newPostElement.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            newPostElement.style.transition = 'all 0.3s ease';
            newPostElement.style.opacity = '1';
            newPostElement.style.transform = 'translateY(0)';
        }, 100);
    }
}

// ===================================
// Category Filters
// ===================================
function setupCategoryFilters() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            filterByCategory(category);
        });
    });
}

function filterByCategory(category) {
    currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    // Reload posts
    loadPosts(true);
    
    // Update URL without page reload
    const url = new URL(window.location);
    if (category === 'all') {
        url.searchParams.delete('category');
    } else {
        url.searchParams.set('category', category);
    }
    window.history.pushState({}, '', url);
}

// ===================================
// Search Functionality
// ===================================
function setupSearch() {
    const searchInput = document.getElementById('forumSearchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            performForumSearch(this.value);
        }, 500));
    }
}

function performForumSearch(query) {
    currentSearch = query;
    loadPosts(true);
}

// ===================================
// Sorting
// ===================================
function setupSorting() {
    const sortSelect = document.getElementById('sortSelect');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortPosts(this.value);
        });
    }
}

function sortPosts(sortType) {
    currentSort = sortType;
    loadPosts(true);
}

// ===================================
// Post Filters
// ===================================
function setupPostFilters() {
    const filterBtns = document.querySelectorAll('.posts-filter .filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            applyPostFilter(filter);
        });
    });
}

function applyPostFilter(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.posts-filter .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Reload posts
    loadPosts(true);
}

// ===================================
// Load Posts
// ===================================
async function loadPosts(reset = false) {
    if (isLoading) return;
    
    const loadingIndicator = document.getElementById('postsLoading');
    const postsList = document.getElementById('postsList');
    
    if (reset) {
        hasMorePosts = true;
    }
    
    if (!hasMorePosts) return;
    
    isLoading = true;
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    try {
        const queryParams = new URLSearchParams({
            category: currentCategory,
            sort: currentSort,
            filter: currentFilter,
            search: currentSearch || '',
            page: reset ? 1 : Math.floor(document.querySelectorAll('.post-card').length / 10) + 1
        });
        
        const response = await fetch(`/api/forum/posts?${queryParams}`);
        
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        
        const data = await response.json();
        
        if (reset) {
            displayPosts(data.posts);
        } else {
            appendPosts(data.posts);
        }
        
        hasMorePosts = data.hasMore;
        updateLoadMoreButton();
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showNotification('Có lỗi xảy ra khi tải bài viết', 'error');
    } finally {
        isLoading = false;
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

function displayPosts(posts) {
    const postsList = document.getElementById('postsList');
    
    if (!postsList) return;
    
    if (posts.length === 0) {
        postsList.innerHTML = `
            <div class="no-posts">
                <div class="no-posts-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h3>Chưa có bài viết nào</h3>
                <p>Hãy là người đầu tiên chia sẻ trong cộng đồng!</p>
                <button class="btn btn-primary" onclick="showCreatePostModal()">
                    <i class="fas fa-plus"></i>
                    Tạo bài viết đầu tiên
                </button>
            </div>
        `;
        return;
    }
    
    postsList.innerHTML = posts.map(post => createPostCard(post)).join('');
    setupPostActions();
}

function appendPosts(posts) {
    const postsList = document.getElementById('postsList');
    
    if (!postsList || posts.length === 0) return;
    
    const postsHTML = posts.map(post => createPostCard(post)).join('');
    postsList.insertAdjacentHTML('beforeend', postsHTML);
    setupPostActions();
}

function createPostCard(post) {
    const timeAgo = formatTimeAgo(post.createdAt);
    const categoryInfo = getCategoryInfo(post.category);
    const isLiked = post.isLiked ? 'liked' : '';
    const featuredBadge = post.isFeatured ? '<div class="featured-badge"><i class="fas fa-fire"></i> Hot</div>' : '';
    const postImage = post.image ? `
        <div class="post-image">
            <img src="${post.image}" alt="Post image" loading="lazy">
        </div>
    ` : '';
    
    return `
        <article class="post-card ${post.isFeatured ? 'featured' : ''}" data-id="${post._id}">
            ${featuredBadge}
            <div class="post-header">
                <div class="post-author">
                    <img src="${post.author.avatar || '/images/default-avatar.png'}" 
                         alt="${post.author.name}" class="author-avatar">
                    <div class="author-info">
                        <h4 class="author-name">${post.author.name}</h4>
                        <span class="author-meta">
                            Sinh viên ${post.author.yearOfStudy && `K${post.author.yearOfStudy}`} • 
                            ${post.author.major} • 
                            ${timeAgo}
                        </span>
                    </div>
                </div>
                <div class="post-actions-menu">
                    <button class="post-menu-btn" onclick="togglePostMenu('${post._id}')">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="post-menu" id="postMenu${post._id}" style="display: none;">
                        <a href="#" class="menu-item" onclick="bookmarkPost('${post._id}')">
                            <i class="fas fa-bookmark"></i>
                            Lưu bài viết
                        </a>
                        <a href="#" class="menu-item" onclick="sharePost('${post._id}')">
                            <i class="fas fa-share"></i>
                            Chia sẻ
                        </a>
                        <a href="#" class="menu-item" onclick="reportPost('${post._id}')">
                            <i class="fas fa-flag"></i>
                            Báo cáo
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="post-content">
                <div class="post-category">
                    <span class="category-tag ${post.category}">
                        <i class="${categoryInfo.icon}"></i>
                        ${categoryInfo.name}
                    </span>
                </div>
                <h3 class="post-title">
                    <a href="/forum/post/${post._id}">${post.title}</a>
                </h3>
                <div class="post-text">
                    <p>${post.content}</p>
                </div>
                ${postImage}
                ${post.tags && post.tags.length > 0 ? `
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="post-footer">
                <div class="post-stats">
                    <button class="stat-btn like-btn ${isLiked}" onclick="toggleLike('${post._id}')">
                        <i class="fa${isLiked ? 's' : 'r'} fa-heart"></i>
                        <span>${post.likeCount}</span>
                    </button>
                    <button class="stat-btn comment-btn" onclick="toggleComments('${post._id}')">
                        <i class="far fa-comment"></i>
                        <span>${post.commentCount}</span>
                    </button>
                    <div class="stat-item">
                        <i class="fas fa-eye"></i>
                        <span>${post.viewCount} lượt xem</span>
                    </div>
                </div>
                <div class="post-time">
                    <time datetime="${post.createdAt}">${timeAgo}</time>
                </div>
            </div>
            
            <!-- Comments Section -->
            <div class="post-comments" id="comments-${post._id}" style="display: none;">
                <div class="comments-list" id="commentsList-${post._id}">
                    <!-- Comments will be loaded here -->
                </div>
                
                <div class="comment-form">
                    <img src="${getCurrentUserAvatar()}" alt="Your avatar" class="comment-form-avatar">
                    <div class="comment-input-wrapper">
                        <textarea placeholder="Viết bình luận..." class="comment-input" id="commentInput-${post._id}"></textarea>
                        <div class="comment-form-actions">
                            <button class="btn btn-primary btn-small" onclick="submitComment('${post._id}')">
                                Gửi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function getCategoryInfo(category) {
    const categories = {
        academic: { name: 'Học tập', icon: 'fas fa-graduation-cap' },
        'campus-life': { name: 'Đời sống', icon: 'fas fa-university' },
        career: { name: 'Nghề nghiệp', icon: 'fas fa-briefcase' },
        events: { name: 'Sự kiện', icon: 'fas fa-calendar' },
        general: { name: 'Tổng hợp', icon: 'fas fa-comments' }
    };
    return categories[category] || categories.general;
}

function getCurrentUserAvatar() {
    // This would be populated from server-side data
    return document.querySelector('meta[name="user-avatar"]')?.content || '/images/default-avatar.png';
}

// ===================================
// Post Actions
// ===================================
function setupPostActions() {
    // Post actions are handled by individual onclick events
    setupClickOutsideMenus();
}

function setupClickOutsideMenus() {
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.post-actions-menu')) {
            document.querySelectorAll('.post-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
}

function togglePostMenu(postId) {
    const menu = document.getElementById(`postMenu${postId}`);
    const allMenus = document.querySelectorAll('.post-menu');
    
    // Close all other menus
    allMenus.forEach(m => {
        if (m !== menu) {
            m.style.display = 'none';
        }
    });
    
    // Toggle current menu
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

async function toggleLike(postId) {
    try {
        const response = await fetch(`/api/forum/posts/${postId}/like`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle like');
        }
        
        const data = await response.json();
        
        // Update UI
        const likeBtn = document.querySelector(`[onclick="toggleLike('${postId}')"]`);
        const heartIcon = likeBtn.querySelector('i');
        const countSpan = likeBtn.querySelector('span');
        
        if (data.isLiked) {
            likeBtn.classList.add('liked');
            heartIcon.className = 'fas fa-heart';
        } else {
            likeBtn.classList.remove('liked');
            heartIcon.className = 'far fa-heart';
        }
        
        countSpan.textContent = data.likeCount;
        
        // Emit real-time update
        if (socket) {
            socket.emit('postLiked', { postId, isLiked: data.isLiked, likeCount: data.likeCount });
        }
        
    } catch (error) {
        console.error('Error toggling like:', error);
        showNotification('Không thể cập nhật thích', 'error');
    }
}

async function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    
    if (!commentsSection) return;
    
    if (commentsSection.style.display === 'none') {
        // Show comments and load them if not loaded
        commentsSection.style.display = 'block';
        
        const commentsList = document.getElementById(`commentsList-${postId}`);
        if (commentsList && commentsList.children.length === 0) {
            await loadComments(postId);
        }
        
        // Focus on comment input
        const commentInput = document.getElementById(`commentInput-${postId}`);
        if (commentInput) {
            setTimeout(() => commentInput.focus(), 100);
        }
    } else {
        commentsSection.style.display = 'none';
    }
}

async function loadComments(postId) {
    const commentsList = document.getElementById(`commentsList-${postId}`);
    
    if (!commentsList) return;
    
    try {
        const response = await fetch(`/api/forum/posts/${postId}/comments`);
        
        if (!response.ok) {
            throw new Error('Failed to load comments');
        }
        
        const comments = await response.json();
        
        commentsList.innerHTML = comments.map(comment => createCommentHTML(comment)).join('');
        
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<p class="error-message">Không thể tải bình luận</p>';
    }
}

function createCommentHTML(comment) {
    const timeAgo = formatTimeAgo(comment.createdAt);
    const isLiked = comment.isLiked ? 'liked' : '';
    
    return `
        <div class="comment" data-id="${comment._id}">
            <img src="${comment.author.avatar || '/images/default-avatar.png'}" 
                 alt="${comment.author.name}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author.name}</span>
                    <span class="comment-time">${timeAgo}</span>
                </div>
                <p class="comment-text">${comment.content}</p>
                <div class="comment-actions">
                    <button class="comment-like ${isLiked}" onclick="toggleCommentLike('${comment._id}')">
                        <i class="fa${isLiked ? 's' : 'r'} fa-heart"></i>
                        <span>${comment.likeCount}</span>
                    </button>
                    <button class="comment-reply" onclick="replyToComment('${comment._id}')">
                        Trả lời
                    </button>
                </div>
                ${comment.replies && comment.replies.length > 0 ? `
                    <div class="comment-replies">
                        ${comment.replies.map(reply => createReplyHTML(reply)).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function createReplyHTML(reply) {
    const timeAgo = formatTimeAgo(reply.createdAt);
    
    return `
        <div class="comment-reply">
            <img src="${reply.author.avatar || '/images/default-avatar.png'}" 
                 alt="${reply.author.name}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${reply.author.name}</span>
                    <span class="comment-time">${timeAgo}</span>
                </div>
                <p class="comment-text">${reply.content}</p>
            </div>
        </div>
    `;
}

async function submitComment(postId) {
    const commentInput = document.getElementById(`commentInput-${postId}`);
    
    if (!commentInput || !commentInput.value.trim()) {
        return;
    }
    
    const content = commentInput.value.trim();
    
    try {
        const response = await fetch(`/api/forum/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit comment');
        }
        
        const comment = await response.json();
        
        // Add comment to UI
        const commentsList = document.getElementById(`commentsList-${postId}`);
        if (commentsList) {
            commentsList.insertAdjacentHTML('beforeend', createCommentHTML(comment));
        }
        
        // Clear input
        commentInput.value = '';
        
        // Update comment count
        const commentBtn = document.querySelector(`[onclick="toggleComments('${postId}')"]`);
        const countSpan = commentBtn.querySelector('span');
        if (countSpan) {
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
        }
        
        // Emit real-time update
        if (socket) {
            socket.emit('newComment', { postId, comment });
        }
        
        showNotification('Bình luận đã được đăng', 'success');
        
    } catch (error) {
        console.error('Error submitting comment:', error);
        showNotification('Không thể đăng bình luận', 'error');
    }
}

async function toggleCommentLike(commentId) {
    try {
        const response = await fetch(`/api/forum/comments/${commentId}/like`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle comment like');
        }
        
        const data = await response.json();
        
        // Update UI
        const likeBtn = document.querySelector(`[onclick="toggleCommentLike('${commentId}')"]`);
        const heartIcon = likeBtn.querySelector('i');
        const countSpan = likeBtn.querySelector('span');
        
        if (data.isLiked) {
            likeBtn.classList.add('liked');
            heartIcon.className = 'fas fa-heart';
        } else {
            likeBtn.classList.remove('liked');
            heartIcon.className = 'far fa-heart';
        }
        
        countSpan.textContent = data.likeCount;
        
    } catch (error) {
        console.error('Error toggling comment like:', error);
        showNotification('Không thể cập nhật thích', 'error');
    }
}

function replyToComment(commentId) {
    // Implementation for replying to comments
    console.log('Reply to comment:', commentId);
    // This would show a reply form under the comment
}

async function bookmarkPost(postId) {
    try {
        const response = await fetch(`/api/forum/posts/${postId}/bookmark`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to bookmark post');
        }
        
        const data = await response.json();
        
        showNotification(
            data.isBookmarked ? 'Đã lưu bài viết' : 'Đã bỏ lưu bài viết', 
            'success'
        );
        
    } catch (error) {
        console.error('Error bookmarking post:', error);
        showNotification('Không thể lưu bài viết', 'error');
    }
}

function sharePost(postId) {
    const postURL = `${window.location.origin}/forum/post/${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Bài viết từ USSH Freshers\' Hub',
            url: postURL
        });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(postURL).then(() => {
            showNotification('Đã sao chép liên kết', 'success');
        });
    }
}

function reportPost(postId) {
    // Show report modal or confirmation
    const reason = prompt('Lý do báo cáo (tùy chọn):');
    
    if (reason !== null) {
        fetch(`/api/forum/posts/${postId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        })
        .then(response => response.json())
        .then(() => {
            showNotification('Đã gửi báo cáo. Cảm ơn bạn!', 'success');
        })
        .catch(error => {
            console.error('Error reporting post:', error);
            showNotification('Không thể gửi báo cáo', 'error');
        });
    }
}

// ===================================
// Load More Posts
// ===================================
function updateLoadMoreButton() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    const spinner = loadMoreBtn?.querySelector('.fa-spinner');
    
    if (!loadMoreBtn) return;
    
    if (hasMorePosts) {
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

function loadMorePosts() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    const spinner = loadMoreBtn?.querySelector('.fa-spinner');
    
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
    }
    
    loadPosts(false);
}

// ===================================
// Create Post Modal
// ===================================
function setupCreatePostModal() {
    const createPostForm = document.getElementById('createPostForm');
    const postTitleInput = document.getElementById('postTitle');
    const postImageInput = document.getElementById('postImage');
    
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreatePost);
    }
    
    if (postTitleInput) {
        postTitleInput.addEventListener('input', function() {
            const charCounter = document.querySelector('.char-counter');
            if (charCounter) {
                charCounter.textContent = `${this.value.length}/200 ký tự`;
            }
        });
    }
    
    if (postImageInput) {
        postImageInput.addEventListener('change', handleImageSelection);
    }
}

function handleImageSelection(e) {
    const file = e.target.files[0];
    const imagePreview = document.getElementById('imagePreview');
    
    if (!file) {
        if (imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
        }
        return;
    }
    
    // Validate image
    if (!file.type.startsWith('image/')) {
        showNotification('Vui lòng chọn file hình ảnh', 'error');
        e.target.value = '';
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showNotification('Hình ảnh quá lớn. Kích thước tối đa là 5MB', 'error');
        e.target.value = '';
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        if (imagePreview) {
            imagePreview.style.display = 'block';
            imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">
                <button type="button" onclick="clearImageSelection()" class="btn btn-small" style="margin-top: 8px;">
                    <i class="fas fa-times"></i> Xóa hình ảnh
                </button>
            `;
        }
    };
    reader.readAsDataURL(file);
}

function clearImageSelection() {
    const postImageInput = document.getElementById('postImage');
    const imagePreview = document.getElementById('imagePreview');
    
    if (postImageInput) postImageInput.value = '';
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.innerHTML = '';
    }
}

async function handleCreatePost(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Disable submit button
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng...';
    }
    
    try {
        const response = await fetch('/api/forum/posts', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to create post');
        }
        
        const post = await response.json();
        
        showNotification('Bài viết đã được đăng thành công!', 'success');
        closeCreatePostModal();
        
        // Add new post to the top of the list if sorting by newest
        if (currentSort === 'newest') {
            prependNewPost(post);
        }
        
        // Emit real-time update
        if (socket) {
            socket.emit('newPost', post);
        }
        
    } catch (error) {
        console.error('Error creating post:', error);
        showNotification('Không thể đăng bài viết', 'error');
    } finally {
        // Reset submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Đăng bài';
        }
    }
}

function showCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        const firstInput = modal.querySelector('select, input, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    const form = document.getElementById('createPostForm');
    
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    if (form) {
        form.reset();
        clearImageSelection();
        
        // Reset character counter
        const charCounter = document.querySelector('.char-counter');
        if (charCounter) {
            charCounter.textContent = '0/200 ký tự';
        }
    }
}

// ===================================
// Utility Functions
// ===================================
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Vừa xong';
    } else if (diffMins < 60) {
        return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
    } else if (diffDays < 30) {
        return `${diffDays} ngày trước`;
    } else {
        return date.toLocaleDateString('vi-VN');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===================================
// Event Listeners
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('forum')) {
        initializeForum();
    }
});

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal') && e.target.id === 'createPostModal') {
        closeCreatePostModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCreatePostModal();
    }
    
    if (e.ctrlKey && e.key === 'Enter') {
        // Quick post shortcut
        const createPostBtn = document.querySelector('[onclick="showCreatePostModal()"]');
        if (createPostBtn && !document.getElementById('createPostModal').style.display) {
            showCreatePostModal();
        }
    }
});

// Infinite scroll
window.addEventListener('scroll', throttle(function() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        if (hasMorePosts && !isLoading) {
            loadMorePosts();
        }
    }
}, 200));

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}