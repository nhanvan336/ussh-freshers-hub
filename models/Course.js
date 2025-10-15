const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  
  department: {
    type: String,
    required: true,
    enum: [
      'Ngôn ngữ học',
      'Văn học',
      'Lịch sử',
      'Triết học', 
      'Xã hội học',
      'Tâm lý học',
      'Nhân học',
      'Khoa học chính trị',
      'Quan hệ quốc tế',
      'Báo chí truyền thông',
      'Thư viện - Thông tin',
      'Du lịch',
      'Đông phương học',
      'Khác'
    ]
  },
  
  semester: {
    type: String,
    required: true,
    enum: ['1', '2', '3', '4', '5', '6', '7', '8']
  },
  
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  
  isCore: {
    type: Boolean,
    default: false
  },
  
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  syllabus: {
    type: String // Link to syllabus document
  },
  
  instructor: {
    name: String,
    email: String,
    office: String
  },
  
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    startTime: String,
    endTime: String,
    room: String
  }],
  
  materials: [{
    title: String,
    type: {
      type: String,
      enum: ['textbook', 'reference', 'article', 'website', 'video', 'other']
    },
    url: String,
    required: {
      type: Boolean,
      default: false
    }
  }],
  
  assessments: [{
    type: {
      type: String,
      enum: ['midterm', 'final', 'assignment', 'project', 'presentation', 'quiz', 'participation']
    },
    weight: {
      type: Number,
      min: 0,
      max: 100
    },
    description: String
  }],
  
  enrollmentLimit: {
    type: Number,
    default: 50
  },
  
  currentEnrollment: {
    type: Number,
    default: 0
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active'
  },
  
  tags: [String],
  
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  
  language: {
    type: String,
    enum: ['Vietnamese', 'English', 'French', 'Chinese', 'Japanese', 'Korean', 'Other'],
    default: 'Vietnamese'
  },
  
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    review: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  totalRatings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
courseSchema.index({ code: 1 });
courseSchema.index({ department: 1 });
courseSchema.index({ semester: 1 });
courseSchema.index({ year: 1 });
courseSchema.index({ name: 'text', description: 'text' });
courseSchema.index({ averageRating: -1 });
courseSchema.index({ createdAt: -1 });

// Virtual for enrollment status
courseSchema.virtual('isFullyEnrolled').get(function() {
  return this.currentEnrollment >= this.enrollmentLimit;
});

// Virtual for available spots
courseSchema.virtual('availableSpots').get(function() {
  return Math.max(0, this.enrollmentLimit - this.currentEnrollment);
});

// Method to calculate average rating
courseSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    this.totalRatings = 0;
  } else {
    const sum = this.ratings.reduce((total, rating) => total + rating.rating, 0);
    this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
    this.totalRatings = this.ratings.length;
  }
};

// Method to add rating
courseSchema.methods.addRating = function(userId, rating, review) {
  // Remove existing rating from this user
  this.ratings = this.ratings.filter(r => !r.user.equals(userId));
  
  // Add new rating
  this.ratings.push({
    user: userId,
    rating,
    review,
    createdAt: new Date()
  });
  
  this.calculateAverageRating();
  return this.save();
};

// Method to check if user can enroll
courseSchema.methods.canEnroll = function(user) {
  // Check if course is active
  if (this.status !== 'active') {
    return { canEnroll: false, reason: 'Course is not active' };
  }
  
  // Check enrollment limit
  if (this.isFullyEnrolled) {
    return { canEnroll: false, reason: 'Course is fully enrolled' };
  }
  
  // Add more enrollment logic here (prerequisites, etc.)
  return { canEnroll: true };
};

// Static method to find courses by department
courseSchema.statics.findByDepartment = function(department, options = {}) {
  const query = { department, status: 'active' };
  return this.find(query)
    .sort(options.sort || { semester: 1, name: 1 })
    .limit(options.limit || 0);
};

// Static method to search courses
courseSchema.statics.searchCourses = function(searchQuery, filters = {}) {
  const query = { status: 'active', ...filters };
  
  if (searchQuery) {
    query.$text = { $search: searchQuery };
  }
  
  return this.find(query)
    .sort(searchQuery ? { score: { $meta: 'textScore' } } : { semester: 1, name: 1 });
};

// Pre-save middleware to update average rating
courseSchema.pre('save', function(next) {
  if (this.isModified('ratings')) {
    this.calculateAverageRating();
  }
  next();
});

// Ensure indexes are created
courseSchema.pre('init', function() {
  this.ensureIndexes();
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
