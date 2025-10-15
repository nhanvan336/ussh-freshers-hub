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
// Phục vụ các file tĩnh (CSS, JS, Images) từ thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Xử lý dữ liệu form và JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Bảo mật và tối ưu hóa
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('dev')); // 'dev' format ngắn gọn hơn cho môi trường phát triển

// === 5. CẤU HÌNH SESSION VÀ AUTHENTICATION (QUAN TRỌNG NHẤT) ===
// Cấu hình Session phải được đặt TRƯỚC khi gọi passport và các routes
app.use(session({
    secret: process.env.SESSION_SECRET || 'ussh-freshers-hub-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Chỉ bật secure cookie khi ở môi trường production (HTTPS)
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 tuần
    }
}));

// Khởi tạo Passport
require('./config/passport'); // Đảm bảo file này được require
app.use(passport.initialize());
app.use(passport.session());

// Khởi tạo Flash messages (phải sau session)
app.use(flash());

// === 6. MIDDLEWARE TOÀN CỤC ĐỂ TRUYỀN BIẾN SANG VIEWS (ĐÃ SỬA LỖI) ===
// Gán thông tin người dùng và các thông báo flash vào res.locals
app.use((req, res, next) => {
    // Passport sẽ tự động thêm `req.user` và `req.isAuthenticated()`
    // Chúng ta chỉ cần gán chúng vào res.locals để EJS có thể truy cập
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.user = req.user; 
    next();
});

// === 7. IMPORT VÀ SỬ DỤNG ROUTES ===
// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
// ... (import các router khác của bạn)
const learningHubRouter = require('./routes/learning-hub');
const forumRouter = require('./routes/forum');
const wellnessRouter = require('./routes/wellness');
const handbookRouter = require('./routes/handbook');

// Sử dụng routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
// ... (sử dụng các router khác)
app.use('/learning-hub', learningHubRouter);
app.use('/forum', forumRouter);
app.use('/wellness', wellnessRouter);
app.use('/handbook', handbookRouter);


// === 8. XỬ LÝ LỖI 404 VÀ LỖI TOÀN CỤC ===
// 404 handler
app.use((req, res, next) => {
    res.status(404).render('pages/404', {
        title: 'Không tìm thấy trang',
        layout: 'layouts/main' // Đảm bảo có layout
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("💥 GLOBAL ERROR HANDLER:", err.stack);
    res.status(err.status || 500).render('error', {
        title: 'Có lỗi xảy ra',
        message: err.message || 'Đã có lỗi không mong muốn xảy ra.'
    });
});

// === 9. KHỞI ĐỘNG SERVER ===
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
