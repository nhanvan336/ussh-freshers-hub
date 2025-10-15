const mongoose = require('mongoose');

const wellnessEntrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  category: {
    type: String,
    required: true,
    enum: [
      'stress-management',
      'anxiety-help',
      'depression-support',
      'academic-pressure',
      'homesickness',
      'relationship-advice',
      'self-care',
      'motivation',
      'time-management',
      'social-skills',
      'healthy-habits',
      'crisis-support'
    ]
  },
  type: {
    type: String,
    required: true,
    enum: ['article', 'tip', 'exercise', 'resource', 'quote', 'video']
  },
  author: {
    name: {
      type: String,
      required: true
    },
    title: String, // Dr., Counselor, etc.
    credentials: String,
    bio: String
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  targetAudience: [{
    type: String,
    enum: ['all-students', 'freshers', 'international-students', 'specific-situation']
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedReadTime: {
    type: Number, // in minutes
    default: 5
  },
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['article', 'video', 'audio', 'pdf', 'website', 'hotline']
    },
    description: String
  }],
  relatedEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WellnessEntry'
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    isAnonymous: {
      type: Boolean,
      default: true
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  lastReviewed: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  helpfulness: {
    helpful: {
      type: Number,
      default: 0
    },
    notHelpful: {
      type: Number,
      default: 0
    }
  },
  triggers: [{
    type: String,
    enum: [
      'academic-stress',
      'social-anxiety',
      'family-issues',
      'financial-stress',
      'health-concerns',
      'relationship-problems',
      'future-uncertainty'
    ]
  }],
  warningLevel: {
    type: String,
    enum: ['none', 'mild', 'moderate', 'severe'],
    default: 'none'
  },
  crisisResources: [{
    name: String,
    phone: String,
    available: String, // "24/7", "Mon-Fri 9-5", etc.
    description: String
  }]
}, {
  timestamps: true
});

// Indexes
wellnessEntrySchema.index({ category: 1, publishDate: -1 });
wellnessEntrySchema.index({ type: 1 });
wellnessEntrySchema.index({ tags: 1 });
wellnessEntrySchema.index({ title: 'text', content: 'text' });
wellnessEntrySchema.index({ isFeatured: -1, views: -1 });
wellnessEntrySchema.index({ targetAudience: 1 });

// Virtual for like count
wellnessEntrySchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for bookmark count
wellnessEntrySchema.virtual('bookmarksCount').get(function() {
  return this.bookmarks ? this.bookmarks.length : 0;
});

// Virtual for helpfulness ratio
wellnessEntrySchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulness.helpful + this.helpfulness.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.helpfulness.helpful / total) * 100);
});

// Method to check if user has liked
wellnessEntrySchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to check if user has bookmarked
wellnessEntrySchema.methods.isBookmarkedBy = function(userId) {
  return this.bookmarks.some(bookmark => bookmark.user.toString() === userId.toString());
};

// Method to toggle like
wellnessEntrySchema.methods.toggleLike = function(userId) {
  const existingLikeIndex = this.likes.findIndex(like => 
    like.user.toString() === userId.toString()
  );
  
  if (existingLikeIndex > -1) {
    this.likes.splice(existingLikeIndex, 1);
    return false;
  } else {
    this.likes.push({ user: userId });
    return true;
  }
};

// Method to toggle bookmark
wellnessEntrySchema.methods.toggleBookmark = function(userId) {
  const existingBookmarkIndex = this.bookmarks.findIndex(bookmark => 
    bookmark.user.toString() === userId.toString()
  );
  
  if (existingBookmarkIndex > -1) {
    this.bookmarks.splice(existingBookmarkIndex, 1);
    return false;
  } else {
    this.bookmarks.push({ user: userId });
    return true;
  }
};

// Method to add comment
wellnessEntrySchema.methods.addComment = function(userId, content, isAnonymous = true) {
  this.comments.push({
    user: userId,
    content: content,
    isAnonymous: isAnonymous
  });
};

// Method to rate helpfulness
wellnessEntrySchema.methods.rateHelpfulness = function(isHelpful) {
  if (isHelpful) {
    this.helpfulness.helpful += 1;
  } else {
    this.helpfulness.notHelpful += 1;
  }
};

module.exports = mongoose.model('WellnessEntry', wellnessEntrySchema);