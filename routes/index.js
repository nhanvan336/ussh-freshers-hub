const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error');
const { optionalAuth } = require('../middleware/auth');
const ForumPost = require('../models/ForumPost');
const WellnessEntry = require('../models/WellnessEntry');
const Event = require('../models/Event');
const Document = require('../models/Document');
const User = require('../models/User');

// Home page
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  try {
    // Fetch recent content for homepage
    const [recentPosts, featuredWellness, upcomingEvents, popularDocuments, stats] = await Promise.all([
      // Recent forum posts
      ForumPost.find({ isSticky: false })
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .limit(5),
      
      // Featured wellness entries
      WellnessEntry.find({ isFeatured: true, isPublished: true })
        .sort({ createdAt: -1 })
        .limit(3),
      
      // Upcoming events
      Event.find({ 
        startDate: { $gte: new Date() },
        status: 'published',
        isPublic: true 
      })
        .sort({ startDate: 1 })
        .limit(4),
      
      // Popular documents
      Document.find({ isApproved: true })
        .populate('uploader', 'username fullName')
        .sort({ downloads: -1 })
        .limit(4),
      
      // Site statistics
      {
        totalUsers: User.countDocuments({ isActive: true }),
        totalPosts: ForumPost.countDocuments(),
        totalDocuments: Document.countDocuments({ isApproved: true }),
        totalEvents: Event.countDocuments({ status: 'published' })
      }
    ]);
    
    // Resolve stats promises
    const resolvedStats = {
      totalUsers: await stats.totalUsers,
      totalPosts: await stats.totalPosts,
      totalDocuments: await stats.totalDocuments,
      totalEvents: await stats.totalEvents
    };
    
    res.render('pages/home', {
      title: 'USSH Freshers\' Hub - Cộng đồng sinh viên K1',
      recentPosts,
      featuredWellness,
      upcomingEvents,
      popularDocuments,
      stats: resolvedStats,
      user: req.user
    });
  } catch (error) {
    console.error('Homepage error:', error);
    res.render('pages/home', {
      title: 'USSH Freshers\' Hub - Cộng đồng sinh viên K1',
      recentPosts: [],
      featuredWellness: [],
      upcomingEvents: [],
      popularDocuments: [],
      stats: { totalUsers: 0, totalPosts: 0, totalDocuments: 0, totalEvents: 0 },
      user: req.user,
      error: 'Có lỗi xảy ra khi tải dữ liệu trang chủ'
    });
  }
}));

// About page
router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'Giới thiệu - USSH Freshers\' Hub',
    user: req.user
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('pages/contact', {
    title: 'Liên hệ - USSH Freshers\' Hub',
    user: req.user
  });
});

// Search functionality
router.get('/search', optionalAuth, asyncHandler(async (req, res) => {
  const { q: query, type = 'all', page = 1 } = req.query;
  const limit = 10;
  const skip = (page - 1) * limit;
  
  if (!query || query.trim().length === 0) {
    return res.render('pages/search', {
      title: 'Tìm kiếm - USSH Freshers\' Hub',
      query: '',
      results: {},
      totalResults: 0,
      currentPage: 1,
      totalPages: 0,
      searchType: type,
      user: req.user
    });
  }
  
  try {
    const searchQuery = {
      $text: { $search: query }
    };
    
    let results = {};
    let totalResults = 0;
    
    // Search based on type
    if (type === 'all' || type === 'posts') {
      results.posts = await ForumPost.find(searchQuery)
        .populate('author', 'username fullName avatar')
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'posts' ? limit : 5)
        .skip(type === 'posts' ? skip : 0);
      
      if (type === 'posts') {
        totalResults = await ForumPost.countDocuments(searchQuery);
      }
    }
    
    if (type === 'all' || type === 'documents') {
      results.documents = await Document.find({
        ...searchQuery,
        isApproved: true
      })
        .populate('uploader', 'username fullName')
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'documents' ? limit : 5)
        .skip(type === 'documents' ? skip : 0);
      
      if (type === 'documents') {
        totalResults = await Document.countDocuments({
          ...searchQuery,
          isApproved: true
        });
      }
    }
    
    if (type === 'all' || type === 'wellness') {
      results.wellness = await WellnessEntry.find({
        ...searchQuery,
        isPublished: true
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'wellness' ? limit : 5)
        .skip(type === 'wellness' ? skip : 0);
      
      if (type === 'wellness') {
        totalResults = await WellnessEntry.countDocuments({
          ...searchQuery,
          isPublished: true
        });
      }
    }
    
    if (type === 'all' || type === 'events') {
      results.events = await Event.find({
        ...searchQuery,
        status: 'published',
        isPublic: true
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(type === 'events' ? limit : 5)
        .skip(type === 'events' ? skip : 0);
      
      if (type === 'events') {
        totalResults = await Event.countDocuments({
          ...searchQuery,
          status: 'published',
          isPublic: true
        });
      }
    }
    
    // Calculate total for 'all' type
    if (type === 'all') {
      totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    }
    
    const totalPages = Math.ceil(totalResults / limit);
    
    res.render('pages/search', {
      title: `Tìm kiếm: ${query} - USSH Freshers\' Hub`,
      query,
      results,
      totalResults,
      currentPage: parseInt(page),
      totalPages,
      searchType: type,
      user: req.user
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.render('pages/search', {
      title: 'Tìm kiếm - USSH Freshers\' Hub',
      query,
      results: {},
      totalResults: 0,
      currentPage: 1,
      totalPages: 0,
      searchType: type,
      error: 'Có lỗi xảy ra khi tìm kiếm',
      user: req.user
    });
  }
}));

// Quick actions for authenticated users
router.get('/dashboard', require('../middleware/auth').isAuthenticated, asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's recent activity
    const [userPosts, userComments, bookmarkedWellness, registeredEvents] = await Promise.all([
      ForumPost.find({ author: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('author', 'username fullName'),
      
      // This would require a Comment model query
      [], // Placeholder for now
      
      WellnessEntry.find({ 'bookmarks.user': userId })
        .limit(5),
      
      Event.find({ 'participants.user': userId, 'participants.status': 'registered' })
        .sort({ startDate: 1 })
        .limit(5)
    ]);
    
    res.render('pages/dashboard', {
      title: 'Dashboard - USSH Freshers\' Hub',
      userPosts,
      userComments,
      bookmarkedWellness,
      registeredEvents,
      user: req.user
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.redirect('/');
  }
}));

// API endpoint for homepage stats
router.get('/api/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ isActive: true }),
      ForumPost.countDocuments(),
      Document.countDocuments({ isApproved: true }),
      Event.countDocuments({ status: 'published' })
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers: stats[0],
        totalPosts: stats[1],
        totalDocuments: stats[2],
        totalEvents: stats[3]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
}));

// Quick suggestions for search
router.get('/api/search-suggestions', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ suggestions: [] });
  }
  
  try {
    const regex = new RegExp(q, 'i');
    
    const [postTitles, documentTitles, wellnessTitles] = await Promise.all([
      ForumPost.find({ title: regex }).select('title').limit(3),
      Document.find({ title: regex, isApproved: true }).select('title').limit(3),
      WellnessEntry.find({ title: regex, isPublished: true }).select('title').limit(3)
    ]);
    
    const suggestions = [
      ...postTitles.map(p => ({ title: p.title, type: 'post' })),
      ...documentTitles.map(d => ({ title: d.title, type: 'document' })),
      ...wellnessTitles.map(w => ({ title: w.title, type: 'wellness' }))
    ].slice(0, 10);
    
    res.json({ suggestions });
  } catch (error) {
    res.json({ suggestions: [] });
  }
}));

// Error pages
router.get('/404', (req, res) => {
  res.status(404).render('pages/404', {
    title: 'Page Not Found - USSH Freshers\' Hub',
    user: req.user
  });
});

router.get('/500', (req, res) => {
  res.status(500).render('pages/error', {
    title: 'Server Error - USSH Freshers\' Hub',
    message: 'Internal Server Error',
    user: req.user
  });
});

module.exports = router;