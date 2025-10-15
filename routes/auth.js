// Thay thế route POST /login cũ bằng route này

router.post('/login',
    loginRateLimit,
    validateUserLogin,
    (req, res, next) => {
        console.log('--- BƯỚC 1: Yêu cầu POST /login đã được nhận ---'); // Dấu vết 1
        console.log('Dữ liệu form gửi lên:', req.body); // Dấu vết 2

        passport.authenticate('local', (err, user, info) => {
            console.log('--- BƯỚC 2: Passport.authenticate callback được thực thi ---'); // Dấu vết 3
            console.log('Lỗi (err):', err); // Dấu vết 4
            console.log('Người dùng (user):', user ? user.email : null); // Dấu vết 5
            console.log('Thông tin (info):', info); // Dấu vết 6

            if (err) {
                console.log('Lỗi: Có lỗi hệ thống từ passport.');
                return next(err);
            }
            if (!user) {
                console.log('Lỗi: Không tìm thấy người dùng hoặc sai mật khẩu.');
                req.flash('error', info.message || 'Đăng nhập thất bại');
                console.log('--- BƯỚC 3: Chuẩn bị chuyển hướng về /auth/login ---'); // Dấu vết 7
                return res.redirect('/auth/login');
            }
            req.logIn(user, (err) => {
                if (err) {
                    console.log('Lỗi: req.logIn thất bại.');
                    return next(err);
                }
                console.log('--- THÀNH CÔNG: Đăng nhập thành công, chuẩn bị chuyển hướng! ---'); // Dấu vết 8
                req.flash('success', `Chào mừng trở lại, ${user.fullName}!`);
                const redirectTo = req.session.returnTo || '/';
                delete req.session.returnTo;
                return res.redirect(redirectTo);
            });
        })(req, res, next);
    }
);
