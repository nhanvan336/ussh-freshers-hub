const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth'); // Giả sử bạn có middleware isAdmin
const Document = require('../models/Document');
const ForumPost = require('../models/ForumPost');

// @route   GET /admin
// @desc    Hiển thị trang chính của Admin Dashboard
// @access  Private (Admin only)
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Lấy 5 tài liệu và 5 bài post mới nhất đang chờ duyệt
        const pendingDocuments = await Document.find({ isApproved: false })
            .populate('uploader', 'username fullName')
            .sort({ createdAt: -1 })
            .limit(5);

        const pendingPosts = await ForumPost.find({ isApproved: false }) // Giả sử ForumPost cũng có isApproved
            .populate('author', 'username fullName')
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('pages/admin/index', {
            title: 'Bảng điều khiển Admin',
            pendingDocuments,
            pendingPosts,
            user: req.user
        });
    } catch (error) {
        console.error("Admin dashboard error:", error);
        res.status(500).render('error', { title: 'Lỗi Server' });
    }
});

// @route   POST /admin/document/:id/approve
// @desc    Duyệt một tài liệu
// @access  Private (Admin only)
router.post('/document/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await Document.findByIdAndUpdate(req.params.id, { isApproved: true });
        req.flash('success_msg', 'Đã duyệt tài liệu thành công.');
        res.redirect('/admin');
    } catch (error) {
        console.error("Approve document error:", error);
        req.flash('error_msg', 'Lỗi khi duyệt tài liệu.');
        res.redirect('/admin');
    }
});

// (Bạn có thể thêm route để từ chối/xóa tài liệu ở đây)

module.exports = router;
