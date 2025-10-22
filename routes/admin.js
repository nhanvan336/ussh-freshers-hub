const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth'); // Chỉ dùng 'isAuthenticated' mà chúng ta biết chắc là có
const Document = require('../models/Document');
const ForumPost = require('../models/ForumPost');

// @route   GET /admin
// @desc    Hiển thị trang chính của Admin Dashboard
// @access  Private (Admin only)
// [SỬA LỖI] Gỡ bỏ 'isAdmin' để tránh crash server
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // [THẬN TRỌNG] Thêm kiểm tra vai trò (role) ngay tại đây
        if (req.user.role !== 'admin') {
            req.flash('error_msg', 'Bạn không có quyền truy cập trang này.');
            return res.redirect('/');
        }

        const pendingDocuments = await Document.find({ isApproved: false })
            .populate('uploader', 'username fullName')
            .sort({ createdAt: -1 })
            .limit(5);

        const pendingPosts = await ForumPost.find({ isApproved: false })
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
// [SỬA LỖI] Gỡ bỏ 'isAdmin'
router.post('/document/:id/approve', isAuthenticated, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            req.flash('error_msg', 'Bạn không có quyền thực hiện hành động này.');
            return res.redirect('/');
        }

        await Document.findByIdAndUpdate(req.params.id, { isApproved: true });
        req.flash('success_msg', 'Đã duyệt tài liệu thành công.');
        res.redirect('/admin');
    } catch (error) {
        console.error("Approve document error:", error);
        req.flash('error_msg', 'Lỗi khi duyệt tài liệu.');
        res.redirect('/admin');
    }
});

module.exports = router;

