const express = require('express');
const router = express.Router();

// Danh sách các trang tĩnh mà chúng ta muốn tạo
const staticPages = [
    { path: '/help', title: 'Trung tâm Trợ giúp' },
    { path: '/contact', title: 'Liên hệ' },
    { path: '/feedback', title: 'Góp ý' },
    { path: '/privacy', title: 'Chính sách Bảo mật' },
    { path: '/terms', title: 'Điều khoản Sử dụng' },
    { path: '/accessibility', title: 'Khả năng Tiếp cận' },
    { path: '/sitemap', title: 'Sơ đồ Trang web' },
    { path: '/careers', title: 'Tuyển dụng' }
];

// Tự động tạo một route cho mỗi trang trong danh sách
staticPages.forEach(page => {
    router.get(page.path, (req, res) => {
        try {
            // Tất cả các trang này sẽ cùng sử dụng một file giao diện chung
            res.render('pages/static', {
                title: page.title
            });
        } catch (error) {
            console.error(`Error rendering static page ${page.path}:`, error);
            res.status(500).render('error', { title: 'Có lỗi xảy ra' });
        }
    });
});

module.exports = router;
