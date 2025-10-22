const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// [BỔ SUNG] Import middleware upload file của bạn
// (Giả sử file service của bạn tên là 'file-upload' và có export 'upload')
const { upload } = require('../services/file-upload'); 

// --- TRANG ĐĂNG NHẬP ---
router.get('/login', (req, res) => {
    // ... (code cũ giữ nguyên)
});

router.post('/login', passport.authenticate('local', {
    // ... (code cũ giữ nguyên)
}));

// --- TRANG ĐĂNG KÝ ---
router.get('/register', (req, res) => {
    // ... (code cũ giữ nguyên)
});

router.post('/register', async (req, res) => {
    // ... (code cũ giữ nguyên)
});

// --- ĐĂNG XUẤT ---
router.post('/logout', (req, res, next) => {
    // ... (code cũ giữ nguyên)
});

// --- [BỔ SUNG] QUẢN LÝ HỒ SƠ CÁ NHÂN ---

// @route   GET /auth/profile
// @desc    Hiển thị trang hồ sơ cá nhân
// @access  Private
router.get('/profile', (req, res) => {
    // (isAuthenticated đã được kiểm tra ở file header.ejs,
    // nhưng chúng ta có thể thêm 1 middleware `isAuthenticated` ở đây cho chắc chắn)
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login');
    }
    res.render('pages/auth/profile', { 
        title: 'Hồ sơ của tôi',
        user: req.user // Truyền thông tin user vào trang EJS
    });
});

// @route   POST /auth/profile/avatar
// @desc    Cập nhật ảnh đại diện
// @access  Private
router.post('/profile/avatar', upload.single('avatar'), async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Chưa xác thực' });
    }
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Không có file nào được tải lên.' });
        }
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // (Giả sử file upload service trả về đường dẫn URL của file)
        const avatarUrl = req.file.path; // Hoặc /uploads/avatars/ten-file.png

        user.avatar = avatarUrl;
        await user.save();

        res.json({ success: true, message: 'Cập nhật avatar thành công!', avatarUrl: avatarUrl });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải ảnh lên.' });
    }
});


module.exports = router;

