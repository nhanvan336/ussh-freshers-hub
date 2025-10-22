const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

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

        // [SỬA LỖI] Chỉ cần truyền mật khẩu gốc. File User.js sẽ tự động mã hóa.
        const newUser = new User({ 
            fullName, 
            studentId, 
            major, 
            username: username.toLowerCase(), // Đảm bảo username cũng được chuẩn hóa
            email: email.toLowerCase(), 
            password // Truyền mật khẩu gốc
        });

        // [SỬA LỖI] Gỡ bỏ các dòng mã hóa thủ công
        // const salt = await bcrypt.genSalt(10);
        // newUser.password = await bcrypt.hash(password, salt);
        
        await newUser.save(); // File User.js sẽ tự động hash tại bước này

        req.flash('success_msg', 'Đăng ký thành công! Bây giờ bạn có thể đăng nhập.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Registration error:', err);
        // Thêm log lỗi chi tiết
        if (err.code === 11000) {
            req.flash('error_msg', 'Email, tên đăng nhập, hoặc MSSV đã tồn tại.');
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

module.exports = router;

