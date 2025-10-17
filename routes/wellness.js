const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const WellnessEntry = require('../models/WellnessEntry');
const User = require('../models/User');
const AnonymousQuestion = require('../models/AnonymousQuestion'); // <--- THÊM DÒNG NÀY

// Mental Wellness Corner main page - ĐÃ ĐƠN GIẢN HÓA
router.get('/', optionalAuth, (req, res) => {
  res.render('pages/wellness/index', {
    title: 'Tư vấn tâm lý - USSH Freshers\' Hub',
    user: req.user
  });
});

// BẮT ĐẦU SỬA VÀ BỔ SUNG LOGIC CHO HỎI ĐÁP
// Trang Hỏi đáp ẩn danh (GET - Hiển thị form và danh sách câu hỏi)
router.get('/ask', optionalAuth, asyncHandler(async (req, res) => {
  const questions = await AnonymousQuestion.find()
    .sort({ createdAt: -1 })
    .populate('replies.user', 'fullName avatar'); // Lấy thông tin người trả lời

  res.render('pages/wellness/ask', {
    title: 'Hỏi đáp ẩn danh - USSH Freshers\' Hub',
    questions: questions,
    user: req.user
  });
}));

// Xử lý khi người dùng gửi câu hỏi mới (POST)
router.post('/ask', asyncHandler(async (req, res) => {
  const { questionContent } = req.body;
  if (!questionContent || questionContent.trim() === '') {
    return res.redirect('/wellness/ask');
  }
  const newQuestion = new AnonymousQuestion({
    content: questionContent
  });
  await newQuestion.save();
  res.redirect('/wellness/ask');
}));

// Xử lý khi người dùng gửi câu trả lời (POST)
router.post('/ask/:questionId/reply', isAuthenticated, asyncHandler(async (req, res) => {
  const { replyContent } = req.body;
  const question = await AnonymousQuestion.findById(req.params.questionId);

  if (question && replyContent) {
    question.replies.push({
      user: req.user._id,
      content: replyContent
    });
    question.isAnswered = true;
    await question.save();
  }
  res.redirect('/wellness/ask');
}));

// Trang danh sách bài viết
router.get('/articles', optionalAuth, asyncHandler(async (req, res) => {
  const entries = await WellnessEntry.find({ isPublished: true })
    .sort({ publishDate: -1 });
    
  res.render('pages/wellness/articles', {
    title: 'Bài viết & Kiến thức - USSH Freshers\' Hub',
    entries,
    user: req.user
  });
}));
// KẾT THÚC SỬA VÀ BỔ SUNG

// View wellness entry details
router.get('/entry/:id', optionalAuth, validateObjectId('id'), asyncHandler(async (req, res) => {
  try {
    const entry = await WellnessEntry.findById(req.params.id)
      .populate('relatedEntries')
      .populate('comments.user', 'username fullName avatar');
    
    if (!entry || !entry.isPublished) {
      return res.status(404).render('pages/404', {
        title: 'Không tìm thấy bài viết - USSH Freshers\' Hub',
        user: req.user
      });
    }
    
    // Increment views
    entry.views += 1;
    await entry.save();
    
    // Get related entries
    const relatedEntries = await WellnessEntry.find({
      _id: { $ne: entry._id },
      $or: [
        { category: entry.category },
        { tags: { $in: entry.tags } },
        { triggers: { $in: entry.triggers } }
      ],
      isPublished: true
    })
      .sort({ views: -1 })
      .limit(4);
    
    res.render('pages/wellness/entry', {
      title: `${entry.title} - USSH Freshers\' Hub`,
      entry,
      relatedEntries,
      user: req.user
    });
  } catch (error) {
    console.error('Wellness entry view error:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - USSH Freshers\' Hub',
      message: 'Có lỗi xảy ra khi tải bài viết',
      user: req.user
    });
  }
}));

// Like/Unlike wellness entry
router.post('/entry/:id/like',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const entry = await WellnessEntry.findById(req.params.id);
      
      if (!entry || !entry.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Bài viết không tồn tại'
        });
      }
      
      const isLiked = entry.toggleLike(req.user._id);
      await entry.save();
      
      res.json({
        success: true,
        isLiked,
        likesCount: entry.likesCount
      });
    } catch (error) {
      console.error('Like entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  })
);

// Bookmark/Unbookmark wellness entry
router.post('/entry/:id/bookmark',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const entry = await WellnessEntry.findById(req.params.id);
      
      if (!entry || !entry.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Bài viết không tồn tại'
        });
      }
      
      const isBookmarked = entry.toggleBookmark(req.user._id);
      await entry.save();
      
      res.json({
        success: true,
        isBookmarked,
        bookmarksCount: entry.bookmarksCount
      });
    } catch (error) {
      console.error('Bookmark entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  })
);

// Add comment to wellness entry (anonymous option)
router.post('/entry/:id/comment',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const { content, isAnonymous = true } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung bình luận không được để trống'
        });
      }
      
      const entry = await WellnessEntry.findById(req.params.id);
      
      if (!entry || !entry.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Bài viết không tồn tại'
        });
      }
      
      entry.addComment(req.user._id, content.trim(), isAnonymous === 'true');
      await entry.save();
      
      res.json({
        success: true,
        message: 'Bình luận thành công. Bình luận sẽ được duyệt trước khi hiển thị.'
      });
    } catch (error) {
      console.error('Comment entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi bình luận'
      });
    }
  })
);

// Rate helpfulness of wellness entry
router.post('/entry/:id/rate-helpfulness',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const { isHelpful } = req.body;
      
      if (typeof isHelpful !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ'
        });
      }
      
      const entry = await WellnessEntry.findById(req.params.id);
      
      if (!entry || !entry.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Bài viết không tồn tại'
        });
      }
      
      entry.rateHelpfulness(isHelpful);
      await entry.save();
      
      res.json({
        success: true,
        message: 'Cảm ơn bạn đã đánh giá!',
        helpfulnessRatio: entry.helpfulnessRatio,
        helpfulness: entry.helpfulness
      });
    } catch (error) {
      console.error('Rate helpfulness error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  })
);

// Mood Tracker - Save mood
router.post('/mood-tracker',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      const { mood, note = '' } = req.body;
      
      if (!['very-sad', 'sad', 'neutral', 'happy', 'very-happy'].includes(mood)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái tâm trạng không hợp lệ'
        });
      }
      
      const user = await User.findById(req.user._id);
      
      // Check if user already has mood entry for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingMoodIndex = user.moodEntries.findIndex(entry => 
        entry.date >= today && entry.date < tomorrow
      );
      
      if (existingMoodIndex > -1) {
        // Update existing mood entry
        user.moodEntries[existingMoodIndex].mood = mood;
        user.moodEntries[existingMoodIndex].note = note.trim();
        user.moodEntries[existingMoodIndex].date = new Date();
      } else {
        // Add new mood entry
        user.moodEntries.push({
          mood,
          note: note.trim(),
          date: new Date()
        });
      }
      
      await user.save();
      
      res.json({
        success: true,
        message: 'Đã lưu trạng thái tâm trạng của bạn!'
      });
    } catch (error) {
      console.error('Mood tracker error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lưu tâm trạng'
      });
    }
  })
);

// Get mood history for user
router.get('/mood-history',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      const { period = '7d' } = req.query;
      
      let startDate = new Date();
      switch (period) {
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '7d':
        default:
          startDate.setDate(startDate.getDate() - 7);
      }
      
      const user = await User.findById(req.user._id);
      const moodHistory = user.moodEntries
        .filter(entry => entry.date >= startDate)
        .sort((a, b) => a.date - b.date);
      
      res.json({
        success: true,
        data: moodHistory
      });
    } catch (error) {
      console.error('Mood history error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải lịch sử tâm trạng'
      });
    }
  })
);

// Anonymous Q&A submission
router.post('/anonymous-question',
  asyncHandler(async (req, res) => {
    try {
      const { question, category = 'general' } = req.body;
      
      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập câu hỏi'
        });
      }
      
      if (question.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Câu hỏi quá dài (tối đa 1000 ký tự)'
        });
      }
      
      // In a real implementation, you might save this to a separate model
      // For now, we'll just simulate saving and return success
      
      // TODO: Implement AnonymousQuestion model and save logic
      console.log('Anonymous question received:', {
        question: question.trim(),
        category,
        timestamp: new Date(),
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'Câu hỏi của bạn đã được gửi! Chúng tôi sẽ trả lời sớm nhất có thể.'
      });
    } catch (error) {
      console.error('Anonymous question error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi gửi câu hỏi'
      });
    }
  })
);

// My bookmarks page
router.get('/my-bookmarks', isAuthenticated, asyncHandler(async (req, res) => {
  const { page = 1 } = req.query;
  const limit = 10;
  const skip = (page - 1) * limit;
  
  try {
    const [bookmarkedEntries, totalBookmarks] = await Promise.all([
      WellnessEntry.find({
        'bookmarks.user': req.user._id,
        isPublished: true
      })
        .sort({ 'bookmarks.createdAt': -1 })
        .skip(skip)
        .limit(limit),
      
      WellnessEntry.countDocuments({
        'bookmarks.user': req.user._id,
        isPublished: true
      })
    ]);
    
    const totalPages = Math.ceil(totalBookmarks / limit);
    
    res.render('pages/wellness/bookmarks', {
      title: 'Bài viết đã lưu - USSH Freshers\' Hub',
      entries: bookmarkedEntries,
      currentPage: parseInt(page),
      totalPages,
      totalBookmarks,
      user: req.user
    });
  } catch (error) {
    console.error('Bookmarks error:', error);
    res.render('pages/wellness/bookmarks', {
      title: 'Bài viết đã lưu - USSH Freshers\' Hub',
      entries: [],
      currentPage: 1,
      totalPages: 0,
      totalBookmarks: 0,
      error: 'Có lỗi xảy ra khi tải danh sách bài viết đã lưu',
      user: req.user
    });
  }
}));

// Crisis resources page
router.get('/crisis-resources', (req, res) => {
  const crisisResources = [
    {
      name: 'Trung tâm Tư vấn Tâm lý USSH',
      phone: '024-3833-4050',
      available: 'Thứ 2-6: 8:00-17:00',
      description: 'Tư vấn tâm lý miễn phí cho sinh viên'
    },
    {
      name: 'Đường dây nóng Quốc gia',
      phone: '1800-1567',
      available: '24/7',
      description: 'Hỗ trợ tâm lý khủng hoảng'
    },
    {
      name: 'Tư vấn trực tuyến',
      phone: 'Chat online',
      available: '24/7',
      description: 'Chatbot hỗ trợ tâm lý cơ bản'
    }
  ];
  
  res.render('pages/wellness/crisis-resources', {
    title: 'Hỗ trợ khủng hoảng - USSH Freshers\' Hub',
    crisisResources,
    user: req.user
  });
});

module.exports = router;
