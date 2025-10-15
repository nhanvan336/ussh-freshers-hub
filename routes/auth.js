const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const { loginRateLimit, registerRateLimit } = require('../middleware/auth');
const emailService = require('../services/email');

// Login page (GET)
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('pages/auth/login', {
        title: 'Đăng nhập - USSH Freshers\' Hub',
        // BỔ SUNG: Nạp file CSS để sửa giao diện
        additionalCSS: ['/css/auth.css']
    });
});

// Handle login (POST) - Đã có sẵn các dòng dò vết
router.post('/login',
    loginRateLimit,
    validateUserLogin,
    (req, res, next) => {
        console.log('--- BƯỚC 1: Yêu cầu POST /login đã được nhận ---');
        console.log('Dữ liệu form gửi lên:', req.body);

        passport.authenticate('local', (err, user, info) => {
            console.log('--- BƯỚC 2: Passport.authenticate callback được thực thi ---');
            console.log('Lỗi (err):', err);
            console.log('Người dùng (user):', user ? user.email : null);
            console.log('Thông tin (info):', info);

            if (err) {
                console.log('Lỗi: Có lỗi hệ thống từ passport.');
                return next(err);
            }
            if (!user) {
                console.log('Lỗi: Không tìm thấy người dùng hoặc sai mật khẩu.');
                req.flash('error', info.message || 'Đăng nhập thất bại');
                console.log('--- BƯỚC 3: Chuẩn bị chuyển hướng về /auth/login ---');
                return res.redirect('/auth/login');
            }
            req.logIn(user, (err) => {
                if (err) {
                    console.log('Lỗi: req.logIn thất bại.');
                    return next(err);
                }
                console.log('--- THÀNH CÔNG: Đăng nhập thành công, chuẩn bị chuyển hướng! ---');
                req.flash('success', `Chào mừng trở lại, ${user.fullName}!`);
                const redirectTo = req.session.returnTo || '/';
                delete req.session.returnTo;
                return res.redirect(redirectTo);
            });
        })(req, res, next);
    }
);


// Register page (GET)
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('pages/auth/register', {
        title: 'Đăng ký - USSH Freshers\' Hub',
        // BỔ SUNG: Nạp file CSS để sửa giao diện
        additionalCSS: ['/css/auth.css']
    });
});

// Handle registration (POST)
router.post('/register',
    registerRateLimit,
    validateUserRegistration,
    asyncHandler(async (req, res) => {
        const { fullName, studentId, major, username, email, password } = req.body;
        const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }, { studentId: studentId }]});
        if (existingUser) {
            let message = 'Đăng ký thất bại.';
            if (existingUser.email === email.toLowerCase()) { message = 'Email đã được sử dụng.'; }
            else if (existingUser.username === username.toLowerCase()) { message = 'Tên đăng nhập đã tồn tại.'; }
            else if (existingUser.studentId === studentId) { message = 'Mã sinh viên đã được đăng ký.'; }
            req.flash('error', message);
            return res.redirect('/auth/register');
        }
        const newUser = new User({ fullName, studentId, major, username: username.toLowerCase(), email: email.toLowerCase(), password: password });
        await newUser.save();
        req.logIn(newUser, (err) => {
            if (err) {
                req.flash('success', 'Đăng ký thành công! Vui lòng đăng nhập.');
                return res.redirect('/auth/login');
            }
            req.flash('success', `Chào mừng ${newUser.fullName} đến với USSH Freshers' Hub!`);
            return res.redirect('/');
        });
    })
);


// ... (Tất cả các route khác của bạn như /logout, /forgot-password... đều nằm ở đây)


module.exports = router;
