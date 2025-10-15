const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const chatbotService = require('../services/chatbot');
const ForumPost = require('../models/ForumPost');
const Document = require('../models/Document');
const WellnessEntry = require('../models/WellnessEntry');
const Event = require('../models/Event');
const User = require('../models/User');

// Chatbot API
router.post('/chatbot/message', asyncHandler(async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn không được để trống'
      });
    }
    
    const userId = req.user ? req.user._id : null;
    const response = await chatbotService.processMessage(message.trim(), userId);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Chatbot API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra với chatbot'
    });
  }
}));

// Get chatbot suggestions
router.get('/chatbot/suggestions', (req, res) => {
  try {
    const userContext = req.user ? {
      major: req.user.major,
      yearOfStudy: req.user.yearOfStudy
    } : {};
    
    const suggestions = chatbotService.getSuggestedQuestions(userContext);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Chatbot suggestions error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// Search API
router.get('/search', optionalAuth, asyncHandler(async (req, res) => {
  const { q, type = 'all', limit = 10 } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.json({
      success: true,
      data: {
        posts: [],
        documents: [],
        wellness: [],
        events: [],
        total: 0
      }
    });
  }
  
  try {
    const searchQuery = { $text: { $search: q } };
    const searchLimit = Math.min(parseInt(limit), 50);
    
    let results = {};
    
    if (type === 'all' || type === 'posts') {
      results.posts = await ForumPost.find(searchQuery)
        .populate('author', 'username fullName avatar')
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'posts' ? searchLimit : 5);
    }
    
    if (type === 'all' || type === 'documents') {
      results.documents = await Document.find({
        ...searchQuery,
        isApproved: true
      })
        .populate('uploader', 'username fullName')
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'documents' ? searchLimit : 5);
    }
    
    if (type === 'all' || type === 'wellness') {
      results.wellness = await WellnessEntry.find({
        ...searchQuery,
        isPublished: true
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'wellness' ? searchLimit : 5);
    }
    
    if (type === 'all' || type === 'events') {
      results.events = await Event.find({
        ...searchQuery,
        status: 'published',
        isPublic: true
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'events' ? searchLimit : 5);
    }
    
    const total = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    res.json({
      success: true,
      data: {
        ...results,
        total
      }
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tìm kiếm'
    });
  }
}));

// Autocomplete API
router.get('/autocomplete', asyncHandler(async (req, res) => {
  const { q, type = 'all' } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ suggestions: [] });
  }
  
  try {
    const regex = new RegExp(q, 'i');
    let suggestions = [];
    
    if (type === 'all' || type === 'posts') {
      const postTitles = await ForumPost.find({ title: regex })
        .select('title')
        .limit(3);
      suggestions.push(...postTitles.map(p => ({
        title: p.title,
        type: 'post',
        url: `/forum/post/${p._id}`
      })));
    }
    
    if (type === 'all' || type === 'documents') {
      const docTitles = await Document.find({ 
        title: regex, 
        isApproved: true 
      })
        .select('title')
        .limit(3);
      suggestions.push(...docTitles.map(d => ({
        title: d.title,
        type: 'document',
        url: `/learning-hub/document/${d._id}`
      })));
    }
    
    if (type === 'all' || type === 'wellness') {
      const wellnessTitles = await WellnessEntry.find({ 
        title: regex, 
        isPublished: true 
      })
        .select('title')
        .limit(3);
      suggestions.push(...wellnessTitles.map(w => ({
        title: w.title,
        type: 'wellness',
        url: `/wellness/entry/${w._id}`
      })));
    }
    
    res.json({
      suggestions: suggestions.slice(0, 10)
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.json({ suggestions: [] });
  }
}));

// Statistics API
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ isActive: true }),
      ForumPost.countDocuments(),
      Document.countDocuments({ isApproved: true }),
      Event.countDocuments({ status: 'published' }),
      WellnessEntry.countDocuments({ isPublished: true })
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers: stats[0],
        totalPosts: stats[1],
        totalDocuments: stats[2],
        totalEvents: stats[3],
        totalWellnessEntries: stats[4],
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy thống kê'
    });
  }
}));

// Recent activity API
router.get('/recent-activity', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const activityLimit = Math.min(parseInt(limit), 50);
    
    const [recentPosts, recentDocuments, recentEvents] = await Promise.all([
      ForumPost.find()
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .limit(Math.ceil(activityLimit / 3)),
      
      Document.find({ isApproved: true })
        .populate('uploader', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .limit(Math.ceil(activityLimit / 3)),
      
      Event.find({ status: 'published', isPublic: true })
        .populate('createdBy', 'username fullName')
        .sort({ createdAt: -1 })
        .limit(Math.ceil(activityLimit / 3))
    ]);
    
    // Combine and sort activities
    const activities = [
      ...recentPosts.map(post => ({
        type: 'post',
        title: post.title,
        author: post.author,
        createdAt: post.createdAt,
        url: `/forum/post/${post._id}`,
        excerpt: post.content.substring(0, 100) + '...'
      })),
      ...recentDocuments.map(doc => ({
        type: 'document',
        title: doc.title,
        author: doc.uploader,
        createdAt: doc.createdAt,
        url: `/learning-hub/document/${doc._id}`,
        excerpt: doc.description.substring(0, 100) + '...'
      })),
      ...recentEvents.map(event => ({
        type: 'event',
        title: event.title,
        author: event.createdBy,
        createdAt: event.createdAt,
        url: `/handbook/event/${event._id}`,
        excerpt: event.description.substring(0, 100) + '...'
      }))
    ];
    
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: activities.slice(0, activityLimit)
    });
  } catch (error) {
    console.error('Recent activity API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy hoạt động gần đây'
    });
  }
}));

// User profile API
router.get('/user/:id', validateObjectId('id'), asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean();
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }
    
    // Check privacy settings
    if (!user.preferences.privacy.showProfile && 
        (!req.user || req.user._id.toString() !== user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Thông tin cá nhân được thiết lập riêng tư'
      });
    }
    
    // Get user's recent activity
    const [recentPosts, documentsCount] = await Promise.all([
      ForumPost.find({ author: user._id })
        .select('title createdAt category')
        .sort({ createdAt: -1 })
        .limit(5),
      
      Document.countDocuments({ uploader: user._id, isApproved: true })
    ]);
    
    const publicProfile = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
      major: user.major,
      yearOfStudy: user.yearOfStudy,
      joinedDate: user.joinedDate,
      forumStats: user.forumStats,
      interests: user.interests,
      recentPosts,
      documentsCount
    };
    
    // Show email only if privacy allows or own profile
    if (user.preferences.privacy.showEmail || 
        (req.user && req.user._id.toString() === user._id.toString())) {
      publicProfile.email = user.email;
    }
    
    res.json({
      success: true,
      data: publicProfile
    });
  } catch (error) {
    console.error('User profile API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy thông tin người dùng'
    });
  }
}));

// Trending content API
router.get('/trending', asyncHandler(async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '7d':
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    const [trendingPosts, trendingDocuments, trendingWellness] = await Promise.all([
      ForumPost.find({ createdAt: { $gte: startDate } })
        .populate('author', 'username fullName avatar')
        .sort({ views: -1, 'likes.length': -1 })
        .limit(5),
      
      Document.find({ 
        createdAt: { $gte: startDate },
        isApproved: true 
      })
        .populate('uploader', 'username fullName')
        .sort({ downloads: -1, views: -1 })
        .limit(5),
      
      WellnessEntry.find({ 
        publishDate: { $gte: startDate },
        isPublished: true 
      })
        .sort({ views: -1, 'likes.length': -1 })
        .limit(5)
    ]);
    
    res.json({
      success: true,
      data: {
        posts: trendingPosts,
        documents: trendingDocuments,
        wellness: trendingWellness,
        period
      }
    });
  } catch (error) {
    console.error('Trending API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy nội dung trending'
    });
  }
}));

// Categories API
router.get('/categories', asyncHandler(async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    let categories = {};
    
    if (type === 'all' || type === 'forum') {
      categories.forum = await ForumPost.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
    }
    
    if (type === 'all' || type === 'documents') {
      categories.documents = await Document.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
    }
    
    if (type === 'all' || type === 'wellness') {
      categories.wellness = await WellnessEntry.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
    }
    
    if (type === 'all' || type === 'events') {
      categories.events = await Event.aggregate([
        { $match: { status: 'published', isPublic: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
    }
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Categories API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy danh mục'
    });
  }
}));

// Notification API (placeholder for future implementation)
router.get('/notifications', isAuthenticated, asyncHandler(async (req, res) => {
  try {
    // Placeholder for notification system
    // In a real implementation, you would have a Notification model
    const notifications = [
      {
        id: '1',
        type: 'forum',
        title: 'Có bình luận mới trong bài đăng của bạn',
        message: 'Bài đăng "Xin chào mọi người" có bình luận mới',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: false,
        url: '/forum/post/example'
      }
    ];
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy thông báo'
    });
  }
}));

// Mark notification as read
router.patch('/notifications/:id/read', 
  isAuthenticated, 
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      // Placeholder implementation
      res.json({
        success: true,
        message: 'Đánh dấu đã đọc thành công'
      });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  })
);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;