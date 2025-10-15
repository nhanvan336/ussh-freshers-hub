const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: [
      'academic',
      'extracurricular',
      'social',
      'career',
      'workshop',
      'seminar',
      'deadline',
      'holiday',
      'examination',
      'orientation',
      'club-activity',
      'other'
    ]
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    venue: {
      type: String,
      required: true
    },
    address: String,
    room: String,
    isOnline: {
      type: Boolean,
      default: false
    },
    onlineLink: String
  },
  organizer: {
    name: {
      type: String,
      required: true
    },
    contact: {
      email: String,
      phone: String
    },
    department: String
  },
  targetAudience: [{
    type: String,
    enum: [
      'all-students',
      'freshers',
      'specific-major',
      'specific-year',
      'faculty',
      'staff'
    ]
  }],
  specificMajors: [{
    type: String,
    enum: [
      'Vietnamese Literature',
      'History',
      'Philosophy',
      'Psychology',
      'Sociology',
      'Journalism',
      'International Studies',
      'Oriental Studies',
      'Library Science'
    ]
  }],
  specificYears: [{
    type: Number,
    min: 1,
    max: 6
  }],
  registrationRequired: {
    type: Boolean,
    default: false
  },
  registrationDeadline: Date,
  maxParticipants: Number,
  currentParticipants: {
    type: Number,
    default: 0
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number, // Every X days/weeks/months/years
    endDate: Date,
    daysOfWeek: [Number] // 0=Sunday, 1=Monday, etc.
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'notification', 'sms']
    },
    timeBefore: {
      value: Number,
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days', 'weeks']
      }
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ targetAudience: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ status: 1, isPublic: 1 });

// Virtual for duration in hours
eventSchema.virtual('durationHours').get(function() {
  const diffInMs = this.endDate - this.startDate;
  return Math.round(diffInMs / (1000 * 60 * 60) * 10) / 10;
});

// Virtual for spots remaining
eventSchema.virtual('spotsRemaining').get(function() {
  if (!this.maxParticipants) return null;
  return this.maxParticipants - this.currentParticipants;
});

// Virtual for is registration open
eventSchema.virtual('isRegistrationOpen').get(function() {
  if (!this.registrationRequired) return false;
  if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
  if (this.maxParticipants && this.currentParticipants >= this.maxParticipants) return false;
  return this.status === 'published';
});

// Method to check if user is registered
eventSchema.methods.isUserRegistered = function(userId) {
  return this.participants.some(p => 
    p.user.toString() === userId.toString() && p.status === 'registered'
  );
};

// Method to register user
eventSchema.methods.registerUser = function(userId) {
  if (this.isUserRegistered(userId)) {
    throw new Error('User already registered');
  }
  
  if (!this.isRegistrationOpen) {
    throw new Error('Registration is closed');
  }
  
  this.participants.push({
    user: userId,
    status: 'registered'
  });
  
  this.currentParticipants += 1;
};

// Method to unregister user
eventSchema.methods.unregisterUser = function(userId) {
  const participantIndex = this.participants.findIndex(p => 
    p.user.toString() === userId.toString() && p.status === 'registered'
  );
  
  if (participantIndex === -1) {
    throw new Error('User not registered');
  }
  
  this.participants[participantIndex].status = 'cancelled';
  this.currentParticipants -= 1;
};

// Method to mark attendance
eventSchema.methods.markAttendance = function(userId) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString() && p.status === 'registered'
  );
  
  if (!participant) {
    throw new Error('User not registered for this event');
  }
  
  participant.status = 'attended';
};

module.exports = mongoose.model('Event', eventSchema);