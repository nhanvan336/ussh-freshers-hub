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

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/auth/login',
        failureFlash: true // Tự động gửi thông báo lỗi qua req.flash
    })(req, res, next);
});


// --- TRANG ĐĂNG KÝ ---
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('pages/auth/register', { title: 'Đăng ký', additionalCSS: ['/css/auth.css'] });
});

router.post('/register', async (req, res) => {
    try {
        const { fullName, studentId, major, username, email, password } = req.body;
        // (Bạn có thể thêm lại phần validate mật khẩu mạnh ở đây nếu muốn)

        const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });

        if (existingUser) {
            req.flash('error', 'Email hoặc tên đăng nhập đã tồn tại.');
            return res.redirect('/auth/register');
        }

        const newUser = new User({ fullName, studentId, major, username, email, password });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        await newUser.save();

        req.flash('success', 'Đăng ký thành công! Bây giờ bạn có thể đăng nhập.');
        res.redirect('/auth/login');

    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        res.redirect('/auth/register');
    }
});


// --- ĐĂNG XUẤT ---
router.post('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success', 'Bạn đã đăng xuất thành công.');
        res.redirect('/auth/login');
    });
});

module.exports = router;

