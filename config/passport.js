const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'identifier' }, async (identifier, password, done) => {
            try {
                const query = identifier.includes('@') ? { email: identifier.toLowerCase() } : { username: identifier.toLowerCase() };
                const user = await User.findOne(query);

                if (!user) {
                    return done(null, false, { message: 'Tài khoản không tồn tại.' });
                }

                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Mật khẩu không chính xác.' });
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
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};
