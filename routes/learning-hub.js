console.log('--- ROUTER: File routes/learning-hub.js đã được tải ---'); // LOG KIỂM TRA

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error');
const { isAuthenticated, isVerifiedStudent, postRateLimit } = require('../middleware/auth');
const { validateDocument, validateRating, validateObjectId } = require('../middleware/validation');
const { uploadDocument, handleMulterError, getFileInfo } = require('../services/file-upload');
const Document = require('../models/Document');
const User = require('../models/User');

// Learning Hub main page
router.get('/', asyncHandler(async (req, res) => {
    console.log(`--- ROUTER: Yêu cầu GET /learning-hub đã được nhận bởi router ---`); // LOG KIỂM TRA

    const { category, subject, sort = 'newest', page = 1, q } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    // Build filter query
    let filter = { isApproved: true };
    
    if (category && category !== 'all') {
        filter.category = category;
    }
    
    if (subject && subject !== 'all') {
        filter.subject = subject;
    }
    
    if (q) {
        filter.$text = { $search: q };
    }
    
    // Build sort query
    let sortQuery = {};
    switch (sort) {
        case 'popular':
            sortQuery = { downloads: -1 };
            break;
        case 'rated':
            sortQuery = { 'ratings.rating': -1 };
            break;
        case 'oldest':
            sortQuery = { createdAt: 1 };
            break;
        default:
            sortQuery = { createdAt: -1 };
    }
    
    try {
        const [documents, totalDocuments, featuredDocs, recentUploads] = await Promise.all([
            Document.find(filter)
                .populate('uploader', 'username fullName avatar')
                .sort(sortQuery)
                .skip(skip)
                .limit(limit),
            
            Document.countDocuments(filter),
            
            // Featured documents
            Document.find({ isApproved: true, isFeatured: true })
                .populate('uploader', 'username fullName avatar')
                .limit(3),
            
            // Recent uploads
            Document.find({ isApproved: true })
                .populate('uploader', 'username fullName avatar')
                .sort({ createdAt: -1 })
                .limit(5)
        ]);
        
        const totalPages = Math.ceil(totalDocuments / limit);
        
        console.log('--- ROUTER: Chuẩn bị render file pages/learning-hub/index ---'); // LOG KIỂM TRA
        res.render('pages/learning-hub/index', {
            title: 'Thư viện học tập - USSH Freshers\' Hub',
            documents,
            featuredDocs,
            recentUploads,
            currentPage: parseInt(page),
            totalPages,
            totalDocuments,
            filters: { category, subject, sort, q },
            user: req.user
        });
    } catch (error) {
        console.error('Learning hub error:', error);
        res.render('pages/learning-hub/index', {
            title: 'Thư viện học tập - USSH Freshers\' Hub',
            documents: [],
            featuredDocs: [],
            recentUploads: [],
            currentPage: 1,
            totalPages: 0,
            totalDocuments: 0,
            filters: {},
            error: 'Có lỗi xảy ra khi tải tài liệu',
            user: req.user
        });
    }
}));

// View document details
router.get('/document/:id', validateObjectId('id'), asyncHandler(async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('uploader', 'username fullName avatar bio')
            .populate('ratings.user', 'username fullName')
            .populate('comments.user', 'username fullName avatar');
        
        if (!document) {
            return res.status(404).render('pages/404', {
                title: 'Không tìm thấy tài liệu - USSH Freshers\' Hub',
                user: req.user
            });
        }
        
        if (!document.isApproved && (!req.user || req.user._id.toString() !== document.uploader._id.toString())) {
            return res.status(403).render('pages/403', {
                title: 'Không có quyền truy cập - USSH Freshers\' Hub',
                user: req.user
            });
        }
        
        // Increment views
        document.incrementViews();
        await document.save();
        
        // Get related documents
        const relatedDocuments = await Document.find({
            _id: { $ne: document._id },
            $or: [
                { subject: document.subject },
                { category: document.category },
                { tags: { $in: document.tags } }
            ],
            isApproved: true
        })
            .populate('uploader', 'username fullName')
            .limit(4);
        
        res.render('pages/learning-hub/document', {
            title: `${document.title} - USSH Freshers\' Hub`,
            document,
            relatedDocuments,
            user: req.user
        });
    } catch (error) {
        console.error('Document view error:', error);
        res.status(500).render('pages/error', {
            title: 'Lỗi - USSH Freshers\' Hub',
            message: 'Có lỗi xảy ra khi tải tài liệu',
            user: req.user
        });
    }
}));

// Upload document page
router.get('/upload', isAuthenticated, /* isVerifiedStudent, */ (req, res) => {
    res.render('pages/learning-hub/upload', {
        title: 'Tải lên tài liệu - USSH Freshers\' Hub',
        user: req.user,
        messages: req.flash()
    });
});

// Handle document upload
router.post('/upload',
    isAuthenticated,
    // isVerifiedStudent, //
    postRateLimit,
    uploadDocument.single('document'),
    handleMulterError,
    // validateDocument,
    asyncHandler(async (req, res) => {
        try {
            if (!req.file) {
                req.flash('error', 'Vui lòng chọn file để tải lên');
                return res.redirect('/learning-hub/upload');
            }
            
            const {
                title, description, category, subject, instructor, semester, academicYear, tags
            } = req.body;
            
            // Process tags
            const processedTags = tags ? 
                (Array.isArray(tags) ? tags : tags.split(','))
                    .map(tag => tag.trim().toLowerCase())
                    .filter(tag => tag.length > 0)
                : [];
            
            const document = new Document({
                title: title.trim(),
                description: description.trim(),
                category,
                subject,
                fileInfo: getFileInfo(req.file),
                uploader: req.user._id,
                instructor: instructor ? instructor.trim() : '',
                semester: semester ? semester.trim() : '',
                academicYear: academicYear ? academicYear.trim() : '',
                tags: processedTags,
                isApproved: req.user.role === 'admin' // Auto-approve for admins
            });
            
            await document.save();
            
            req.flash('success', req.user.role === 'admin' 
                ? 'Tải lên thành công và đã được duyệt tự động'
                : 'Tải lên thành công! Tài liệu sẽ được duyệt trong thời gian sớm nhất.');
            
            res.redirect(`/learning-hub/document/${document._id}`);
        } catch (error) {
            console.error('Document upload error:', error);
            req.flash('error', 'Có lỗi xảy ra khi tải lên tài liệu');
            res.redirect('/learning-hub/upload');
        }
    })
);

// Download document
router.get('/download/:id', 
    validateObjectId('id'),
    asyncHandler(async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            
            if (!document || !document.isApproved) {
                return res.status(404).json({
                    success: false,
                    message: 'Tài liệu không tồn tại hoặc chưa được duyệt'
                });
            }
            
            // Check access level
            if (document.accessLevel === 'students-only' && !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vui lòng đăng nhập để tải tài liệu này'
                });
            }
            
            // Increment download count
            const userId = req.user ? req.user._id : null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            
            document.incrementDownloads(userId, ipAddress);
            await document.save();
            
            // Set appropriate headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${document.fileInfo.originalName}"`);
            res.setHeader('Content-Type', document.fileInfo.mimetype);
            
            // For now, redirect to file URL (in production, use proper file serving)
            res.redirect(document.fileInfo.url);
            
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tải file'
            });
        }
    })
);

// Rate document
router.post('/document/:id/rate',
    isAuthenticated,
    validateObjectId('id'),
    validateRating,
    asyncHandler(async (req, res) => {
        try {
            const { rating, review } = req.body;
            const document = await Document.findById(req.params.id);
            
            if (!document || !document.isApproved) {
                return res.status(404).json({
                    success: false,
                    message: 'Tài liệu không tồn tại'
                });
            }
            
            // Check if user already rated
            if (document.hasUserRated(req.user._id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Bạn đã đánh giá tài liệu này rồi'
                });
            }
            
            document.addRating(req.user._id, parseInt(rating), review || '');
            await document.save();
            
            res.json({
                success: true,
                message: 'Đánh giá thành công',
                averageRating: document.averageRating,
                ratingsCount: document.ratingsCount
            });
        } catch (error) {
            console.error('Rating error:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi đánh giá'
            });
        }
    })
);

// Add comment to document
router.post('/document/:id/comment',
    isAuthenticated,
    validateObjectId('id'),
    asyncHandler(async (req, res) => {
        try {
            const { content } = req.body;
            
            if (!content || content.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nội dung bình luận không được để trống'
                });
            }
            
            const document = await Document.findById(req.params.id);
            
            if (!document || !document.isApproved) {
                return res.status(404).json({
                    success: false,
                    message: 'Tài liệu không tồn tại'
                });
            }
            
            document.addComment(req.user._id, content.trim());
            await document.save();
            
            // Populate the new comment for response
            await document.populate('comments.user', 'username fullName avatar');
            const newComment = document.comments[document.comments.length - 1];
            
            res.json({
                success: true,
                message: 'Bình luận thành công',
                comment: newComment
            });
        } catch (error) {
            console.error('Comment error:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi bình luận'
            });
        }
    })
);

// My uploads page
router.get('/my-uploads', isAuthenticated, asyncHandler(async (req, res) => {
    const { page = 1, status = 'all' } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    let filter = { uploader: req.user._id };
    
    if (status === 'approved') {
        filter.isApproved = true;
    } else if (status === 'pending') {
        filter.isApproved = false;
    }
    
    try {
        const [documents, totalDocuments] = await Promise.all([
            Document.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            
            Document.countDocuments(filter)
        ]);
        
        const totalPages = Math.ceil(totalDocuments / limit);
        
        res.render('pages/learning-hub/my-uploads', {
            title: 'Tài liệu của tôi - USSH Freshers\' Hub',
            documents,
            currentPage: parseInt(page),
            totalPages,
            totalDocuments,
            filterStatus: status,
            user: req.user
        });
    } catch (error) {
        console.error('My uploads error:', error);
        res.render('pages/learning-hub/my-uploads', {
            title: 'Tài liệu của tôi - USSH Freshers\' Hub',
            documents: [],
            currentPage: 1,
            totalPages: 0,
            totalDocuments: 0,
            filterStatus: status,
            error: 'Có lỗi xảy ra khi tải danh sách tài liệu',
            user: req.user
        });
    }
}));

// Delete document (for uploaders and admins)
router.delete('/document/:id',
    isAuthenticated,
    validateObjectId('id'),
    asyncHandler(async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Tài liệu không tồn tại'
                });
            }
            
            // Check permissions
            const canDelete = document.uploader.toString() === req.user._id.toString() || 
                                req.user.role === 'admin';
            
            if (!canDelete) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa tài liệu này'
                });
            }
            
            // Delete file from filesystem (implement based on your storage solution)
            const { deleteFile } = require('../services/file-upload');
            const filePath = `public${document.fileInfo.url}`;
            deleteFile(filePath);
            
            await Document.findByIdAndDelete(req.params.id);
            
            res.json({
                success: true,
                message: 'Xóa tài liệu thành công'
            });
        } catch (error) {
            console.error('Delete document error:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa tài liệu'
            });
        }
    })
);

module.exports = router;
