const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// Local Strategy - ĐÃ NÂNG CẤP
passport.use(new LocalStrategy({
    // 1. Thay đổi để chấp nhận trường 'identifier' từ form đăng nhập
    usernameField: 'identifier',
    passwordField: 'password'
}, async (identifier, password, done) => {
    try {
        // 2. Tìm người dùng bằng cả email hoặc username
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier.toLowerCase() }
            ]
        });
        
        // 3. Sử dụng thông báo chung để tăng bảo mật
        if (!user) {
            return done(null, false, { message: 'Tài khoản hoặc mật khẩu không chính xác.' });
        }

        // Check if user is active
        if (!user.isActive) {
            return done(null, false, { message: 'Tài khoản này đã bị vô hiệu hóa.' });
        }

        // 4. Sử dụng phương thức so sánh mật khẩu đã viết trong User model
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return done(null, false, { message: 'Tài khoản hoặc mật khẩu không chính xác.' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Serialize user for session (Giữ nguyên)
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session (Giữ nguyên)
passport.deserializeUser(async (id, done) => {
    try {
        // Lấy thông tin user nhưng không lấy mật khẩu
        const user = await User.findById(id).select('-password');
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
