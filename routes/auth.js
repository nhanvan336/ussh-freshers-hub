const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// ... (Các phần require models và middleware giữ nguyên)
const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const { loginRateLimit, registerRateLimit } = require('../middleware/auth');
const emailService = require('../services/email');


// Login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    // GỠ BỎ `messages: req.flash()` vì đã có middleware toàn cục lo việc này
    res.render('pages/auth/login', {
        title: 'Đăng nhập - USSH Freshers\' Hub'
    });
});

// Handle login
router.post('/login',
    loginRateLimit,
    validateUserLogin,
    (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                // Chỉ cần đặt thông báo, redirect là đủ
                req.flash('error', info.message || 'Tài khoản hoặc mật khẩu không chính xác.');
                return res.redirect('/auth/login');
            }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                req.flash('success', `Chào mừng trở lại, ${user.fullName}!`);
                const redirectTo = req.session.returnTo || '/';
                delete req.session.returnTo;
                return res.redirect(redirectTo);
            });
        })(req, res, next);
    }
);

// Register page
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    // GỠ BỎ `messages: req.flash()`
    res.render('pages/auth/register', {
        title: 'Đăng ký - USSH Freshers\' Hub'
    });
});

// Handle registration
router.post('/register',
    registerRateLimit,
    validateUserRegistration,
    asyncHandler(async (req, res, next) => {
        // ... (Toàn bộ logic xử lý đăng ký của bạn rất tốt, giữ nguyên không đổi)
        const { fullName, studentId, major, username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }, { studentId: studentId }]});
        if (existingUser) {
            let message = 'Đăng ký thất bại';
            if (existingUser.email === email.toLowerCase()) { message = 'Email đã được sử dụng'; }
            else if (existingUser.username === username.toLowerCase()) { message = 'Tên đăng nhập đã tồn tại'; }
            else if (existingUser.studentId === studentId) { message = 'Mã sinh viên đã được đăng ký'; }
            req.flash('error', message);
            return res.redirect('/auth/register');
        }

        const newUser = new User({
            fullName, studentId, major,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: password
        });

        await newUser.save();
        
        req.logIn(newUser, (err) => {
            if (err) {
                console.error('Auto-login error:', err);
                req.flash('success', 'Đăng ký thành công! Vui lòng đăng nhập.');
                return res.redirect('/auth/login');
            }
            req.flash('success', `Chào mừng ${newUser.fullName} đến với USSH Freshers' Hub!`);
            return res.redirect('/');
        });
    })
);

// Logout
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return next(err);
        }
        req.flash('success', 'Đã đăng xuất thành công.');
        res.redirect('/');
    });
});

// ... (Các route khác như forgot-password, reset-password giữ nguyên logic tương tự, chỉ cần đảm bảo gỡ bỏ `messages: req.flash()` trong các lệnh render GET)

module.exports = router;
```eof
