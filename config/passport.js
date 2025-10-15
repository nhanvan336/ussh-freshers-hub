const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'identifier' }, async (identifier, password, done) => {
            try {
                // Tìm người dùng bằng email hoặc username
                const query = identifier.includes('@')
                    ? { email: identifier.toLowerCase() }
                    : { username: identifier.toLowerCase() };
                
                const user = await User.findOne(query);

                // Trường hợp không tìm thấy user
                if (!user) {
                    return done(null, false, { message: 'Tài khoản không tồn tại.' });
                }

                // So sánh mật khẩu
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    return done(null, user); // Thành công
                } else {
                    return done(null, false, { message: 'Mật khẩu không chính xác.' }); // Sai mật khẩu
                }
            } catch (err) {
                console.error('Passport strategy error:', err);
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};
