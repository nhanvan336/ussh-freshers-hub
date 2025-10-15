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

// Login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    // Sửa lỗi: Đã gỡ bỏ `messages: req.flash()`
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
                req.flash('error', info.message || 'Đăng nhập thất bại');
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
    // Sửa lỗi: Đã gỡ bỏ `messages: req.flash()`
    res.render('pages/auth/register', {
        title: 'Đăng ký - USSH Freshers\' Hub'
    });
});

// Handle registration
router.post('/register',
    registerRateLimit,
    validateUserRegistration,
    asyncHandler(async (req, res) => {
        try {
            const {
                username, email, password, fullName, studentId, major, yearOfStudy = 1
            } = req.body;
            
            const existingUser = await User.findOne({
                $or: [
                    { email: email.toLowerCase() }, { username: username.toLowerCase() }, { studentId: studentId }
                ]
            });
            
            if (existingUser) {
                let message = 'Đăng ký thất bại';
                if (existingUser.email === email.toLowerCase()) { message = 'Email đã được sử dụng'; }
                else if (existingUser.username === username.toLowerCase()) { message = 'Tên đăng nhập đã tồn tại'; }
                else if (existingUser.studentId === studentId) { message = 'Mã sinh viên đã được đăng ký'; }
                
                req.flash('error', message);
                return res.redirect('/auth/register');
            }
            
            const newUser = new User({
                username: username.toLowerCase(), email: email.toLowerCase(), password: password,
                fullName, studentId, major, yearOfStudy: parseInt(yearOfStudy), emailVerified: false
            });
            
            await newUser.save();
            
            try {
                await emailService.sendWelcomeEmail(newUser);
            } catch (emailError) {
                console.error('Welcome email error:', emailError);
            }
            
            req.logIn(newUser, (err) => {
                if (err) {
                    console.error('Auto-login error:', err);
                    req.flash('success', 'Đăng ký thành công! Vui lòng đăng nhập.');
                    return res.redirect('/auth/login');
                }
                
                req.flash('success', `Chào mừng ${newUser.fullName} đến với USSH Freshers' Hub!`);
                return res.redirect('/');
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            req.flash('error', 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.');
            res.redirect('/auth/register');
        }
    })
);

// Logout
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return next(err); // Thêm next(err) để xử lý lỗi tốt hơn
        }
        req.flash('success', 'Đã đăng xuất thành công');
        res.redirect('/');
    });
});

// Forgot password page
router.get('/forgot-password', (req, res) => {
    // Sửa lỗi: Đã gỡ bỏ `messages: req.flash()`
    res.render('pages/auth/forgot-password', {
        title: 'Quên mật khẩu - USSH Freshers\' Hub'
    });
});

// Handle forgot password
router.post('/forgot-password',
    loginRateLimit,
    asyncHandler(async (req, res) => {
        try {
            const { email } = req.body;
            
            if (!email) {
                req.flash('error', 'Vui lòng nhập địa chỉ email');
                return res.redirect('/auth/forgot-password');
            }
            
            const user = await User.findOne({ email: email.toLowerCase() });
            
            req.flash('success', 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
            
            if (user) {
                const resetToken = uuidv4();
                user.resetPasswordToken = resetToken;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                await user.save();
                
                try {
                    await emailService.sendPasswordResetEmail(user, resetToken);
                } catch (emailError) {
                    console.error('Reset email error:', emailError);
                }
            }
            
            res.redirect('/auth/forgot-password');
        } catch (error) {
            console.error('Forgot password error:', error);
            req.flash('error', 'Có lỗi xảy ra. Vui lòng thử lại.');
            res.redirect('/auth/forgot-password');
        }
    })
);

// Reset password page
router.get('/reset-password', asyncHandler(async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            req.flash('error', 'Link đặt lại mật khẩu không hợp lệ');
            return res.redirect('/auth/forgot-password');
        }
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ');
            return res.redirect('/auth/forgot-password');
        }
        
        // Sửa lỗi: Đã gỡ bỏ `messages: req.flash()`
        res.render('pages/auth/reset-password', {
            title: 'Đặt lại mật khẩu - USSH Freshers\' Hub',
            token
        });
    } catch (error) {
        console.error('Reset password page error:', error);
        req.flash('error', 'Có lỗi xảy ra');
        res.redirect('/auth/forgot-password');
    }
}));

// Handle reset password
router.post('/reset-password', asyncHandler(async (req, res) => {
    // ... Giữ nguyên logic gốc của bạn ...
    // (Phần này đã đúng)
}));

// Profile page
router.get('/profile', require('../middleware/auth').isAuthenticated, (req, res) => {
    // Sửa lỗi: Đã gỡ bỏ `messages: req.flash()`
    res.render('pages/auth/profile', {
        title: 'Hồ sơ cá nhân - USSH Freshers\' Hub',
        user: req.user
    });
});

// Update profile
router.post('/profile',
    require('../middleware/auth').isAuthenticated,
    asyncHandler(async (req, res) => {
        // ... Giữ nguyên logic gốc của bạn ...
    })
);

// Change password
router.post('/change-password',
    require('../middleware/auth').isAuthenticated,
    asyncHandler(async (req, res) => {
        // ... Giữ nguyên logic gốc của bạn ...
    })
);

module.exports = router;
