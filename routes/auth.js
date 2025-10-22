const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// [SỬA LỖI] Sử dụng đúng tên middleware upload từ file service của bạn
// (Giả sử bạn dùng chung `uploadAttachment` từ file `forum.js`)
const { uploadAttachment } = require('../services/file-upload'); 

// --- TRANG ĐĂNG NHẬP ---
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('pages/auth/login', { title: 'Đăng nhập', additionalCSS: ['/css/auth.css'] });
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true
}));

// --- TRANG ĐĂNG KÝ ---
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('pages/auth/register', { title: 'Đăng ký', additionalCSS: ['/css/auth.css'] });
});

router.post('/register', async (req, res) => {
    try {
        const { fullName, studentId, major, username, email, password } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
        if (existingUser) {
            req.flash('error_msg', 'Email hoặc tên đăng nhập đã được sử dụng.');
            return res.redirect('/auth/register');
        }
        
        const newUser = new User({ 
            fullName, 
            studentId, 
            major, 
            username: username.toLowerCase(),
            email: email.toLowerCase(), 
            password
        });
        
        await newUser.save();
        
        req.flash('success_msg', 'Đăng ký thành công! Bây giờ bạn có thể đăng nhập.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 11000) {
            let field = Object.keys(err.keyPattern)[0];
            if (field === 'studentId') {
                req.flash('error_msg', 'Mã số sinh viên đã tồn tại.');
            } else if (field === 'email') {
                req.flash('error_msg', 'Email đã được sử dụng.');
            } else if (field === 'username') {
                req.flash('error_msg', 'Tên đăng nhập đã tồn tại.');
            } else {
                req.flash('error_msg', 'Thông tin đăng ký đã tồn tại.');
            }
        } else {
            req.flash('error_msg', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        }
        res.redirect('/auth/register');
    }
});

// --- ĐĂNG XUẤT ---
router.post('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success_msg', 'Bạn đã đăng xuất thành công.');
        res.redirect('/auth/login');
    });
});

// --- QUẢN LÝ HỒ SƠ CÁ NHÂN ---

// @route   GET /auth/profile
// @desc    Hiển thị trang hồ sơ cá nhân
// @access  Private
router.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login');
    }
    res.render('pages/auth/profile', { 
        title: 'Hồ sơ của tôi',
        user: req.user 
    });
});

// @route   POST /auth/profile/avatar
// @desc    Cập nhật ảnh đại diện
// @access  Private
// [SỬA LỖI] Sử dụng đúng biến `uploadAttachment`
router.post('/profile/avatar', uploadAttachment.single('avatar'), async (req, res) => {
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

