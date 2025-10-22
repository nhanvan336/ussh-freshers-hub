const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'identifier' }, async (identifier, password, done) => {
            try {
                const query = identifier.includes('@') ? { email: identifier.toLowerCase() } : { username: identifier.toLowerCase() };
                
                // [SỬA LỖI] Đảm bảo chúng ta cũng tìm username đã được chuẩn hóa
                const user = await User.findOne(query);

                if (!user) {
                    return done(null, false, { message: 'Tài khoản không tồn tại.' });
                }

                // [SỬA LỖI] Sử dụng phương thức comparePassword của User model
                const isMatch = await user.comparePassword(password);
                
                if (isMatch) {
                    return done(null, user); // Đăng nhập thành công
                } else {
                    return done(null, false, { message: 'Mật khẩu không chính xác.' }); // Sai mật khẩu
                }
            } catch (err) {
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            // [SỬA LỖI] Không cần loại bỏ password ở đây, chỉ cần lấy user
            const user = await User.findById(id); 
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};

