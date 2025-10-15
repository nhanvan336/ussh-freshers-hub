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
  
  res.render('pages/auth/login', {
    title: 'Đăng nhập - USSH Freshers\' Hub',
    messages: req.flash()
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
        
        // Redirect to intended page or dashboard
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
  
  res.render('pages/auth/register', {
    title: 'Đăng ký - USSH Freshers\' Hub',
    messages: req.flash()
  });
});

// Handle registration
router.post('/register', 
  registerRateLimit,
  validateUserRegistration,
  asyncHandler(async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        fullName,
        studentId,
        major,
        yearOfStudy = 1
      } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          { studentId: studentId }
        ]
      });
      
      if (existingUser) {
        let message = 'Đăng ký thất bại';
        if (existingUser.email === email.toLowerCase()) {
          message = 'Email đã được sử dụng';
        } else if (existingUser.username === username.toLowerCase()) {
          message = 'Tên đăng nhập đã tồn tại';
        } else if (existingUser.studentId === studentId) {
          message = 'Mã sinh viên đã được đăng ký';
        }
        
        req.flash('error', message);
        return res.redirect('/auth/register');
      }
      
      // Create new user
      const newUser = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: password, // Will be hashed by pre-save middleware
        fullName,
        studentId,
        major,
        yearOfStudy: parseInt(yearOfStudy),
        emailVerified: false // Require email verification
      });
      
      await newUser.save();
      
      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(newUser);
      } catch (emailError) {
        console.error('Welcome email error:', emailError);
        // Don't fail registration if email fails
      }
      
      // Log user in automatically
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
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.flash('success', 'Đã đăng xuất thành công');
    res.redirect('/');
  });
});

// Forgot password page
router.get('/forgot-password', (req, res) => {
  res.render('pages/auth/forgot-password', {
    title: 'Quên mật khẩu - USSH Freshers\' Hub',
    messages: req.flash()
  });
});

// Handle forgot password
router.post('/forgot-password', 
  loginRateLimit, // Reuse login rate limit
  asyncHandler(async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        req.flash('error', 'Vui lòng nhập địa chỉ email');
        return res.redirect('/auth/forgot-password');
      }
      
      const user = await User.findOne({ email: email.toLowerCase() });
      
      // Always show success message for security
      req.flash('success', 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
      
      if (user) {
        // Generate reset token
        const resetToken = uuidv4();
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send reset email
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
    
    res.render('pages/auth/reset-password', {
      title: 'Đặt lại mật khẩu - USSH Freshers\' Hub',
      token,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Reset password page error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/auth/forgot-password');
  }
}));

// Handle reset password
router.post('/reset-password', asyncHandler(async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    if (!password || !confirmPassword) {
      req.flash('error', 'Vui lòng nhập đầy đủ thông tin');
      return res.redirect(`/auth/reset-password?token=${token}`);
    }
    
    if (password !== confirmPassword) {
      req.flash('error', 'Mật khẩu xác nhận không khớp');
      return res.redirect(`/auth/reset-password?token=${token}`);
    }
    
    if (password.length < 6) {
      req.flash('error', 'Mật khẩu phải có ít nhất 6 ký tự');
      return res.redirect(`/auth/reset-password?token=${token}`);
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error', 'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ');
      return res.redirect('/auth/forgot-password');
    }
    
    // Update password
    user.password = password; // Will be hashed by pre-save middleware
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    req.flash('success', 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
    res.redirect('/auth/login');
    
  } catch (error) {
    console.error('Reset password error:', error);
    req.flash('error', 'Có lỗi xảy ra. Vui lòng thử lại.');
    res.redirect('/auth/forgot-password');
  }
}));

// Profile page
router.get('/profile', require('../middleware/auth').isAuthenticated, (req, res) => {
  res.render('pages/auth/profile', {
    title: 'Hồ sơ cá nhân - USSH Freshers\' Hub',
    user: req.user,
    messages: req.flash()
  });
});

// Update profile
router.post('/profile', 
  require('../middleware/auth').isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      const { fullName, bio, interests, major, yearOfStudy } = req.body;
      
      const user = await User.findById(req.user._id);
      
      if (!user) {
        req.flash('error', 'Không tìm thấy thông tin người dùng');
        return res.redirect('/auth/profile');
      }
      
      // Update fields
      if (fullName) user.fullName = fullName.trim();
      if (bio !== undefined) user.bio = bio.trim();
      if (interests) {
        user.interests = Array.isArray(interests) 
          ? interests.map(i => i.trim()).filter(i => i.length > 0)
          : interests.split(',').map(i => i.trim()).filter(i => i.length > 0);
      }
      if (major) user.major = major;
      if (yearOfStudy) user.yearOfStudy = parseInt(yearOfStudy);
      
      await user.save();
      
      req.flash('success', 'Cập nhật thông tin thành công');
      res.redirect('/auth/profile');
      
    } catch (error) {
      console.error('Profile update error:', error);
      req.flash('error', 'Có lỗi xảy ra khi cập nhật thông tin');
      res.redirect('/auth/profile');
    }
  })
);

// Change password
router.post('/change-password',
  require('../middleware/auth').isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        req.flash('error', 'Vui lòng nhập đầy đủ thông tin');
        return res.redirect('/auth/profile');
      }
      
      if (newPassword !== confirmPassword) {
        req.flash('error', 'Mật khẩu mới không khớp');
        return res.redirect('/auth/profile');
      }
      
      if (newPassword.length < 6) {
        req.flash('error', 'Mật khẩu mới phải có ít nhất 6 ký tự');
        return res.redirect('/auth/profile');
      }
      
      const user = await User.findById(req.user._id);
      
      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        req.flash('error', 'Mật khẩu hiện tại không đúng');
        return res.redirect('/auth/profile');
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      req.flash('success', 'Đổi mật khẩu thành công');
      res.redirect('/auth/profile');
      
    } catch (error) {
      console.error('Change password error:', error);
      req.flash('error', 'Có lỗi xảy ra khi đổi mật khẩu');
      res.redirect('/auth/profile');
    }
  })
);

module.exports = router;