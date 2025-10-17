const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const anonymousQuestionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Nội dung câu hỏi không được để trống'],
    trim: true,
    maxlength: 2000
  },
  replies: [replySchema],
  isAnswered: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AnonymousQuestion', anonymousQuestionSchema);
