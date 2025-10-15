const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: [
      'textbooks',
      'lecture-notes',
      'research-papers',
      'thesis-samples',
      'study-guides',
      'exam-materials',
      'reference-books',
      'multimedia',
      'other'
    ]
  },
  subject: {
    type: String,
    required: true,
    enum: [
      'Vietnamese Literature',
      'History',
      'Philosophy', 
      'Psychology',
      'Sociology',
      'Journalism',
      'International Studies',
      'Oriental Studies',
      'Library Science',
      'General Studies',
      'Foreign Languages',
      'Research Methods'
    ]
  },
  fileInfo: {
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  instructor: {
    type: String,
    trim: true
  },
  semester: {
    type: String,
    trim: true
  },
  academicYear: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    review: {
      type: String,
      maxlength: 500
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
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isApproved: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  accessLevel: {
    type: String,
    enum: ['public', 'students-only', 'restricted'],
    default: 'students-only'
  },
  downloadHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }],
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['copyright', 'inappropriate', 'spam', 'broken-link', 'other']
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
documentSchema.index({ category: 1, subject: 1 });
documentSchema.index({ uploader: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ title: 'text', description: 'text' });
documentSchema.index({ isApproved: 1, createdAt: -1 });
documentSchema.index({ downloads: -1 });
documentSchema.index({ 'ratings.rating': -1 });

// Virtual for average rating
documentSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

// Virtual for rating count
documentSchema.virtual('ratingsCount').get(function() {
  return this.ratings ? this.ratings.length : 0;
});

// Virtual for comments count
documentSchema.virtual('commentsCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for file size in human readable format
documentSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileInfo.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Method to check if user has rated
documentSchema.methods.hasUserRated = function(userId) {
  return this.ratings.some(rating => rating.user.toString() === userId.toString());
};

// Method to add or update rating
documentSchema.methods.addRating = function(userId, rating, review = '') {
  const existingRatingIndex = this.ratings.findIndex(r => 
    r.user.toString() === userId.toString()
  );
  
  if (existingRatingIndex > -1) {
    // Update existing rating
    this.ratings[existingRatingIndex].rating = rating;
    this.ratings[existingRatingIndex].review = review;
    this.ratings[existingRatingIndex].createdAt = new Date();
  } else {
    // Add new rating
    this.ratings.push({
      user: userId,
      rating: rating,
      review: review
    });
  }
};

// Method to increment downloads
documentSchema.methods.incrementDownloads = function(userId, ipAddress) {
  this.downloads += 1;
  this.downloadHistory.push({
    user: userId,
    ipAddress: ipAddress
  });
};

// Method to increment views
documentSchema.methods.incrementViews = function() {
  this.views += 1;
};

// Method to add comment
documentSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content
  });
};

module.exports = mongoose.model('Document', documentSchema);