const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const flash = require('connect-flash');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// === 1. KHỞI TẠO APP ===
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ussh_freshers_hub';

// === BẮT BUỘC CHO RENDER ===
app.set('trust proxy', 1);

// === 2. KẾT NỐI DATABASE ===
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => { console.error('❌ MongoDB Connection Error:', err); process.exit(1); });

// === 3. VIEW ENGINE ===
app.use(expressLayouts);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === 4. MIDDLEWARE CƠ BẢN ===
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// === 5. MIDDLEWARE XÁC THỰC (THỨ TỰ CỰC KỲ QUAN TRỌNG) ===
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-that-is-long',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// === 6. MIDDLEWARE TOÀN CỤC ===
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.user = req.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// === 7. ROUTES ===
console.log('--- SERVER: Đang chuẩn bị định nghĩa các routes ---');

require('./config/passport')(passport); 
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));

// *** BỔ SUNG CÁC ROUTES CÒN THIẾU TẠI ĐÂY ***
const learningHubRouter = require('./routes/learning-hub');
const forumRouter = require('./routes/forum');
const wellnessRouter = require('./routes/wellness');
const handbookRouter = require('./routes/handbook');
// [THÊM MỚI - BƯỚC 1] Import route của API chatbot vào đây
const chatbotApiRoutes = require('./routes/api/chatbot');

app.use('/learning-hub', learningHubRouter);
app.use('/forum', forumRouter);
app.use('/wellness', wellnessRouter);
app.use('/handbook', handbookRouter);

// [THÊM MỚI - BƯỚC 2] Kết nối route của API chatbot vào ứng dụng
app.use('/api/chatbot', chatbotApiRoutes);

console.log('--- SERVER: Các routes đã được định nghĩa xong ---');


// === 8. XỬ LÝ LỖI ===
app.use((req, res, next) => {
    console.log(`--- SERVER: Không tìm thấy route cho ${req.method} ${req.originalUrl}. Đang hiển thị trang 404. ---`);
    res.status(404).render('pages/404', { title: 'Không tìm thấy trang' });
});
app.use((err, req, res, next) => {
    console.error("💥 GLOBAL ERROR HANDLER:", err.stack);
    res.status(500).render('error', { title: 'Có lỗi xảy ra', message: 'Đã có lỗi không mong muốn xảy ra.' });
});

// === 9. KHỞI ĐỘNG SERVER ===
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
