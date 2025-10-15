const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
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
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'academic-help',
      'clubs-activities', 
      'housing-accommodation',
      'general-chat',
      'events-announcements',
      'study-groups',
      'career-advice',
      'campus-life'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isSticky: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
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
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'other']
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  commentsCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }]
    }],
    allowMultiple: {
      type: Boolean,
      default: false
    },
    expiresAt: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
forumPostSchema.index({ category: 1, createdAt: -1 });
forumPostSchema.index({ author: 1 });
forumPostSchema.index({ tags: 1 });
forumPostSchema.index({ title: 'text', content: 'text' });
forumPostSchema.index({ isSticky: -1, lastActivity: -1 });

// Virtual for like count
forumPostSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for poll total votes
forumPostSchema.virtual('pollTotalVotes').get(function() {
  if (!this.poll || !this.poll.options) return 0;
  return this.poll.options.reduce((total, option) => {
    return total + (option.votes ? option.votes.length : 0);
  }, 0);
});

// Method to check if user has liked the post
forumPostSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to toggle like
forumPostSchema.methods.toggleLike = function(userId) {
  const existingLikeIndex = this.likes.findIndex(like => 
    like.user.toString() === userId.toString()
  );
  
  if (existingLikeIndex > -1) {
    this.likes.splice(existingLikeIndex, 1);
    return false; // unliked
  } else {
    this.likes.push({ user: userId });
    return true; // liked
  }
};

// Method to check if user has voted in poll
forumPostSchema.methods.hasUserVoted = function(userId) {
  if (!this.poll || !this.poll.options) return false;
  
  return this.poll.options.some(option => 
    option.votes.some(vote => vote.user.toString() === userId.toString())
  );
};

// Method to add poll vote
forumPostSchema.methods.addPollVote = function(userId, optionIndex) {
  if (!this.poll || !this.poll.options[optionIndex]) {
    throw new Error('Invalid poll option');
  }
  
  // Check if poll has expired
  if (this.poll.expiresAt && new Date() > this.poll.expiresAt) {
    throw new Error('Poll has expired');
  }
  
  // Check if user has already voted (if multiple votes not allowed)
  if (!this.poll.allowMultiple && this.hasUserVoted(userId)) {
    throw new Error('User has already voted');
  }
  
  this.poll.options[optionIndex].votes.push({ user: userId });
};

// Pre-save middleware to update lastActivity
forumPostSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

module.exports = mongoose.model('ForumPost', forumPostSchema);