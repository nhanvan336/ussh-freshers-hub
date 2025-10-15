const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const flash = require('express-flash');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// === 1. KHỞI TẠO APP VÀ CÁC BIẾN CƠ BẢN ===
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ussh_freshers_hub';

// === 2. KẾT NỐI DATABASE ===
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// === 3. CẤU HÌNH VIEW ENGINE (EJS) ===
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === 4. CẤU HÌNH CÁC MIDDLEWARE CƠ BẢN ===
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(helmet({ contentSecurityPolicy: false })); // Tạm tắt CSP để tránh lỗi hiển thị
app.use(compression());
app.use(cors());
app.use(morgan('dev'));

// === 5. CẤU HÌNH SESSION VÀ AUTHENTICATION ===
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-that-is-long',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 tuần
    }
}));

// Khởi tạo Passport
require('./config/passport')(passport); // Truyền passport vào file config
app.use(passport.initialize());
app.use(passport.session());

// Khởi tạo Flash messages
app.use(flash());

// === 6. MIDDLEWARE TOÀN CỤC ĐỂ TRUYỀN BIẾN SANG VIEWS ===
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.user = req.user;
    // express-flash sẽ tự động thêm `success_msg` và `error_msg` vào locals
    next();
});

// === 7. ROUTES ===
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/learning-hub', require('./routes/learning-hub'));
app.use('/forum', require('./routes/forum'));
app.use('/wellness', require('./routes/wellness'));
app.use('/handbook', require('./routes/handbook'));

// === 8. XỬ LÝ LỖI ===
app.use((req, res, next) => {
    res.status(404).render('pages/404', { title: 'Không tìm thấy trang' });
});
app.use((err, req, res, next) => {
    console.error("💥 GLOBAL ERROR HANDLER:", err.stack);
    res.status(500).render('error', { title: 'Có lỗi xảy ra', message: 'Đã có lỗi không mong muốn xảy ra.' });
});

// === 9. KHỞI ĐỘNG SERVER ===
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
