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
}, {
  // Bật virtuals để có thể sử dụng trường ảo
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- BẮT ĐẦU THÊM MÃ ĐỊNH DANH ---
// Tạo một trường ảo 'anonymousId' không lưu trong database
// Nó sẽ tự động lấy 6 ký tự cuối của ID câu hỏi để làm mã định danh
anonymousQuestionSchema.virtual('anonymousId').get(function() {
  return this._id.toString().slice(-6).toUpperCase();
});
// --- KẾT THÚC THÊM MÃ ĐỊNH DANH ---

module.exports = mongoose.model('AnonymousQuestion', anonymousQuestionSchema);
