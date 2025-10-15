// Forum API Routes
const express = require('express');
const router = express.Router();

// Import controllers
const forumController = require('../../controllers/forumController');

// Import middleware
const { authenticate, optionalAuth, moderatorOrAdmin } = require('../../middleware/auth');
const {
    validateForumPost,
    validateComment,
    validateObjectId,
    validatePagination,
    validateSearch
} = require('../../middleware/validation');

/**
 * @route   GET /api/forum/posts
 * @desc    Get all forum posts with pagination and filters
 * @access  Public
 */
router.get('/posts',
    optionalAuth,
    validatePagination,
    validateSearch,
    forumController.getPosts
);

/**
 * @route   GET /api/forum/posts/trending
 * @desc    Get trending posts
 * @access  Public
 */
router.get('/posts/trending',
    optionalAuth,
    forumController.getTrendingPosts
);

/**
 * @route   GET /api/forum/posts/:id
 * @desc    Get single forum post
 * @access  Public
 */
router.get('/posts/:id',
    optionalAuth,
    validateObjectId('id'),
    forumController.getPost
);

/**
 * @route   POST /api/forum/posts
 * @desc    Create new forum post
 * @access  Private
 */
router.post('/posts',
    authenticate,
    validateForumPost,
    forumController.createPost
);

/**
 * @route   PUT /api/forum/posts/:id
 * @desc    Update forum post
 * @access  Private (Author/Moderator/Admin)
 */
router.put('/posts/:id',
    authenticate,
    validateObjectId('id'),
    validateForumPost,
    forumController.updatePost
);

/**
 * @route   DELETE /api/forum/posts/:id
 * @desc    Delete forum post
 * @access  Private (Author/Moderator/Admin)
 */
router.delete('/posts/:id',
    authenticate,
    validateObjectId('id'),
    forumController.deletePost
);

/**
 * @route   POST /api/forum/posts/:id/like
 * @desc    Like/Unlike forum post
 * @access  Private
 */
router.post('/posts/:id/like',
    authenticate,
    validateObjectId('id'),
    forumController.toggleLike
);

/**
 * @route   POST /api/forum/posts/:id/save
 * @desc    Save/Unsave forum post
 * @access  Private
 */
router.post('/posts/:id/save',
    authenticate,
    validateObjectId('id'),
    forumController.toggleSave
);

/**
 * @route   POST /api/forum/posts/:id/comments
 * @desc    Add comment to post
 * @access  Private
 */
router.post('/posts/:id/comments',
    authenticate,
    validateObjectId('id'),
    validateComment,
    forumController.addComment
);

/**
 * @route   POST /api/forum/posts/:id/report
 * @desc    Report forum post
 * @access  Private
 */
router.post('/posts/:id/report',
    authenticate,
    validateObjectId('id'),
    forumController.reportPost
);

/**
 * @route   GET /api/forum/stats
 * @desc    Get forum statistics
 * @access  Public
 */
router.get('/stats', forumController.getForumStats);

module.exports = router;