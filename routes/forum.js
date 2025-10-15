const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error');
const { isAuthenticated, postRateLimit, commentRateLimit } = require('../middleware/auth');
const { validateForumPost, validateComment, validateObjectId } = require('../middleware/validation');
const { uploadAttachment, handleMulterError } = require('../services/file-upload');
const ForumPost = require('../models/ForumPost');
const Comment = require('../models/Comment');
const User = require('../models/User');

// Forum main page
router.get('/', asyncHandler(async (req, res) => {
  const { category = 'all', sort = 'latest', page = 1, q } = req.query;
  const limit = 15;
  const skip = (page - 1) * limit;
  
  // Build filter query
  let filter = {};
  
  if (category && category !== 'all') {
    filter.category = category;
  }
  
  if (q) {
    filter.$text = { $search: q };
  }
  
  // Build sort query
  let sortQuery = {};
  switch (sort) {
    case 'popular':
      sortQuery = { 'likes.length': -1, lastActivity: -1 };
      break;
    case 'discussed':
      sortQuery = { commentsCount: -1, lastActivity: -1 };
      break;
    case 'oldest':
      sortQuery = { createdAt: 1 };
      break;
    default: // latest
      sortQuery = { isSticky: -1, lastActivity: -1 };
  }
  
  try {
    const [posts, totalPosts, stickyPosts, categories] = await Promise.all([
      ForumPost.find(filter)
        .populate('author', 'username fullName avatar forumStats')
        .sort(sortQuery)
        .skip(skip)
        .limit(limit),
      
      ForumPost.countDocuments(filter),
      
      // Get sticky posts separately for top display
      ForumPost.find({ isSticky: true })
        .populate('author', 'username fullName avatar')
        .sort({ lastActivity: -1 })
        .limit(3),
      
      // Get category statistics
      ForumPost.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    
    const totalPages = Math.ceil(totalPosts / limit);
    
    res.render('pages/forum/index', {
      title: 'Diễn đàn cộng đồng - USSH Freshers\' Hub',
      posts,
      stickyPosts,
      categories,
      currentPage: parseInt(page),
      totalPages,
      totalPosts,
      filters: { category, sort, q },
      user: req.user
    });
  } catch (error) {
    console.error('Forum error:', error);
    res.render('pages/forum/index', {
      title: 'Diễn đàn cộng đồng - USSH Freshers\' Hub',
      posts: [],
      stickyPosts: [],
      categories: [],
      currentPage: 1,
      totalPages: 0,
      totalPosts: 0,
      filters: {},
      error: 'Có lỗi xảy ra khi tải diễn đàn',
      user: req.user
    });
  }
}));

// Create new post page
router.get('/create', isAuthenticated, (req, res) => {
  res.render('pages/forum/create', {
    title: 'Tạo bài đăng mới - USSH Freshers\' Hub',
    user: req.user,
    messages: req.flash()
  });
});

// Handle create post
router.post('/create',
  isAuthenticated,
  postRateLimit,
  uploadAttachment.array('attachments', 3),
  handleMulterError,
  validateForumPost,
  asyncHandler(async (req, res) => {
    try {
      const {
        title,
        content,
        category,
        tags,
        pollQuestion,
        pollOptions,
        pollAllowMultiple,
        pollExpiresIn
      } = req.body;
      
      // Process tags
      const processedTags = tags ? 
        (Array.isArray(tags) ? tags : tags.split(','))
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0)
        : [];
      
      // Process attachments
      const attachments = req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/attachments/${file.filename}`
      })) : [];
      
      // Process poll if provided
      let poll = null;
      if (pollQuestion && pollOptions) {
        const options = Array.isArray(pollOptions) 
          ? pollOptions 
          : pollOptions.split('\n');
        
        poll = {
          question: pollQuestion.trim(),
          options: options
            .filter(opt => opt.trim().length > 0)
            .map(opt => ({ text: opt.trim(), votes: [] })),
          allowMultiple: pollAllowMultiple === 'true',
          expiresAt: pollExpiresIn ? new Date(Date.now() + parseInt(pollExpiresIn) * 24 * 60 * 60 * 1000) : null
        };
      }
      
      const post = new ForumPost({
        title: title.trim(),
        content: content.trim(),
        author: req.user._id,
        category,
        tags: processedTags,
        attachments,
        poll
      });
      
      await post.save();
      
      // Update user forum stats
      req.user.updateForumStats('postsCount');
      await req.user.save();
      
      req.flash('success', 'Tạo bài đăng thành công!');
      res.redirect(`/forum/post/${post._id}`);
    } catch (error) {
      console.error('Create post error:', error);
      req.flash('error', 'Có lỗi xảy ra khi tạo bài đăng');
      res.redirect('/forum/create');
    }
  })
);

// View post details
router.get('/post/:id', validateObjectId('id'), asyncHandler(async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'username fullName avatar bio forumStats joinedDate')
      .populate('likes.user', 'username fullName')
      .populate('poll.options.votes.user', 'username fullName');
    
    if (!post) {
      return res.status(404).render('pages/404', {
        title: 'Không tìm thấy bài đăng - USSH Freshers\' Hub',
        user: req.user
      });
    }
    
    // Increment views
    post.views += 1;
    await post.save();
    
    // Get comments with pagination
    const { page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const [comments, totalComments] = await Promise.all([
      Comment.find({ post: post._id })
        .populate('author', 'username fullName avatar forumStats')
        .populate('likes.user', 'username fullName')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      
      Comment.countDocuments({ post: post._id })
    ]);
    
    const totalPages = Math.ceil(totalComments / limit);
    
    // Get related posts
    const relatedPosts = await ForumPost.find({
      _id: { $ne: post._id },
      $or: [
        { category: post.category },
        { tags: { $in: post.tags } }
      ]
    })
      .populate('author', 'username fullName')
      .sort({ lastActivity: -1 })
      .limit(5);
    
    res.render('pages/forum/post', {
      title: `${post.title} - USSH Freshers\' Hub`,
      post,
      comments,
      relatedPosts,
      currentPage: parseInt(page),
      totalPages,
      totalComments,
      user: req.user
    });
  } catch (error) {
    console.error('Post view error:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - USSH Freshers\' Hub',
      message: 'Có lỗi xảy ra khi tải bài đăng',
      user: req.user
    });
  }
}));

// Like/Unlike post
router.post('/post/:id/like',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const post = await ForumPost.findById(req.params.id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Bài đăng không tồn tại'
        });
      }
      
      const isLiked = post.toggleLike(req.user._id);
      await post.save();
      
      // Update author's likes received count
      if (isLiked) {
        const author = await User.findById(post.author);
        author.updateForumStats('likesReceived');
        await author.save();
      }
      
      res.json({
        success: true,
        isLiked,
        likesCount: post.likesCount
      });
    } catch (error) {
      console.error('Like post error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  })
);

// Add comment to post
router.post('/post/:id/comment',
  isAuthenticated,
  commentRateLimit,
  validateObjectId('id'),
  validateComment,
  asyncHandler(async (req, res) => {
    try {
      const { content, parentComment } = req.body;
      const post = await ForumPost.findById(req.params.id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Bài đăng không tồn tại'
        });
      }
      
      if (post.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'Bài đăng này đã bị khóa'
        });
      }
      
      const comment = new Comment({
        content: content.trim(),
        author: req.user._id,
        post: post._id,
        parentComment: parentComment || null
      });
      
      await comment.save();
      
      // Update post comment count and last activity
      post.commentsCount += 1;
      post.lastActivity = new Date();
      await post.save();
      
      // Update user forum stats
      req.user.updateForumStats('commentsCount');
      await req.user.save();
      
      // Populate comment for response
      await comment.populate('author', 'username fullName avatar forumStats');
      
      res.json({
        success: true,
        message: 'Bình luận thành công',
        comment
      });
    } catch (error) {
      console.error('Comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi bình luận'
      });
    }
  })
);

// Like/Unlike comment
router.post('/comment/:id/like',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id);
      
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Bình luận không tồn tại'
        });
      }
      
      const isLiked = comment.toggleLike(req.user._id);
      await comment.save();
      
      res.json({
        success: true,
        isLiked,
        likesCount: comment.likesCount
      });
    } catch (error) {
      console.error('Like comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  })
);

// Vote in poll
router.post('/post/:id/poll/vote',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const { optionIndex } = req.body;
      const post = await ForumPost.findById(req.params.id);
      
      if (!post || !post.poll) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy cuộc thăm dò'
        });
      }
      
      if (post.poll.expiresAt && new Date() > post.poll.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'Cuộc thăm dò đã hết hạn'
        });
      }
      
      try {
        post.addPollVote(req.user._id, parseInt(optionIndex));
        await post.save();
        
        res.json({
          success: true,
          message: 'Bầu chọn thành công',
          poll: post.poll
        });
      } catch (pollError) {
        res.status(400).json({
          success: false,
          message: pollError.message
        });
      }
    } catch (error) {
      console.error('Poll vote error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi bầu chọn'
      });
    }
  })
);

// My posts page
router.get('/my-posts', isAuthenticated, asyncHandler(async (req, res) => {
  const { page = 1 } = req.query;
  const limit = 10;
  const skip = (page - 1) * limit;
  
  try {
    const [posts, totalPosts] = await Promise.all([
      ForumPost.find({ author: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      
      ForumPost.countDocuments({ author: req.user._id })
    ]);
    
    const totalPages = Math.ceil(totalPosts / limit);
    
    res.render('pages/forum/my-posts', {
      title: 'Bài đăng của tôi - USSH Freshers\' Hub',
      posts,
      currentPage: parseInt(page),
      totalPages,
      totalPosts,
      user: req.user
    });
  } catch (error) {
    console.error('My posts error:', error);
    res.render('pages/forum/my-posts', {
      title: 'Bài đăng của tôi - USSH Freshers\' Hub',
      posts: [],
      currentPage: 1,
      totalPages: 0,
      totalPosts: 0,
      error: 'Có lỗi xảy ra khi tải danh sách bài đăng',
      user: req.user
    });
  }
}));

// Delete post (for authors and admins)
router.delete('/post/:id',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const post = await ForumPost.findById(req.params.id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Bài đăng không tồn tại'
        });
      }
      
      // Check permissions
      const canDelete = post.author.toString() === req.user._id.toString() || 
                       ['admin', 'moderator'].includes(req.user.role);
      
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa bài đăng này'
        });
      }
      
      // Delete associated comments
      await Comment.deleteMany({ post: post._id });
      
      // Delete post
      await ForumPost.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'Xóa bài đăng thành công'
      });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa bài đăng'
      });
    }
  })
);

module.exports = router;