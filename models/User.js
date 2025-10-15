const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  major: {
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
      'Other'
    ]
  },
  yearOfStudy: {
    type: Number,
    required: true,
    min: 1,
    max: 6,
    default: 1
  },
  avatar: {
    type: String,
    default: '/images/avatars/default-avatar.png'
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  interests: [{
    type: String,
    trim: true
  }],
  role: {
    type: String,
    enum: ['student', 'admin', 'moderator'],
    default: 'student'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  forumStats: {
    postsCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 },
    reputation: { type: Number, default: 0 }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      forum: { type: Boolean, default: true },
      wellness: { type: Boolean, default: true }
    },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showProfile: { type: Boolean, default: true }
    }
  },
  moodEntries: [{
    mood: {
      type: String,
      enum: ['very-sad', 'sad', 'neutral', 'happy', 'very-happy']
    },
    date: {
      type: Date,
      default: Date.now
    },
    note: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ major: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update forum stats
userSchema.methods.updateForumStats = function(type, increment = 1) {
  if (this.forumStats[type] !== undefined) {
    this.forumStats[type] += increment;
    if (type === 'likesReceived') {
      this.forumStats.reputation += increment * 2;
    }
  }
};

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.fullName || this.username;
});

// Virtual for avatar URL
userSchema.virtual('avatarUrl').get(function() {
  return this.avatar.startsWith('http') ? this.avatar : this.avatar;
});

// Transform JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);