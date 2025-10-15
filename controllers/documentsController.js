// Documents Controller (Handbook)
const Document = require('../models/Document');
const User = require('../models/User');
const { 
    catchAsync, 
    AppError, 
    NotFoundError,
    AuthorizationError 
} = require('../middleware/errorHandler');

/**
 * Get all documents with pagination and filters
 */
const getDocuments = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 12,
        category,
        subject,
        search,
        sort = '-createdAt',
        tags
    } = req.query;

    // Build filter object
    const filter = {};

    if (category && category !== 'all') {
        filter.category = category;
    }

    if (subject) {
        filter.subject = { $regex: subject, $options: 'i' };
    }

    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
        ];
    }

    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        filter.tags = { $in: tagArray };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get documents
    const documents = await Document.find(filter)
        .populate('uploadedBy', 'username fullName profilePicture role')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Get total count for pagination
    const total = await Document.countDocuments(filter);

    // Add user's bookmark status if authenticated
    if (req.userId) {
        const user = await User.findById(req.userId);
        documents.forEach(doc => {
            doc.isBookmarked = user.bookmarkedDocuments?.includes(doc._id) || false;
        });
    }

    res.json({
        success: true,
        data: {
            documents,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalDocuments: total,
                hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            }
        }
    });
});

/**
 * Get single document
 */
const getDocument = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const document = await Document.findById(id)
        .populate('uploadedBy', 'username fullName profilePicture role bio')
        .lean();

    if (!document) {
        return next(new NotFoundError('Document not found'));
    }

    // Increment view count
    await Document.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Add user's bookmark status if authenticated
    if (req.userId) {
        const user = await User.findById(req.userId);
        document.isBookmarked = user.bookmarkedDocuments?.includes(document._id) || false;
    }

    res.json({
        success: true,
        data: {
            document
        }
    });
});

/**
 * Create new document
 */
const createDocument = catchAsync(async (req, res, next) => {
    const {
        title,
        description,
        content,
        category,
        subject,
        tags,
        fileUrl,
        fileType,
        fileSize
    } = req.body;

    const document = new Document({
        title,
        description,
        content,
        category,
        subject,
        tags: tags || [],
        fileUrl,
        fileType,
        fileSize,
        uploadedBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    await document.save();

    // Populate uploader info
    await document.populate('uploadedBy', 'username fullName profilePicture role');

    // Update user's documents shared count
    await User.findByIdAndUpdate(req.userId, {
        $push: { documentsShared: document._id }
    });

    res.status(201).json({
        success: true,
        message: 'Document created successfully',
        data: {
            document
        }
    });
});

/**
 * Update document
 */
const updateDocument = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
        return next(new NotFoundError('Document not found'));
    }

    // Check if user is owner or has admin/moderator role
    const user = await User.findById(req.userId);
    if (document.uploadedBy.toString() !== req.userId && !['admin', 'moderator'].includes(user.role)) {
        return next(new AuthorizationError('Not authorized to update this document'));
    }

    // Update allowed fields
    const allowedUpdates = [
        'title', 'description', 'content', 'category', 
        'subject', 'tags', 'fileUrl', 'fileType', 'fileSize'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
            updates[key] = req.body[key];
        }
    });

    updates.updatedAt = new Date();

    const updatedDocument = await Document.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
    ).populate('uploadedBy', 'username fullName profilePicture role');

    res.json({
        success: true,
        message: 'Document updated successfully',
        data: {
            document: updatedDocument
        }
    });
});

/**
 * Delete document
 */
const deleteDocument = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
        return next(new NotFoundError('Document not found'));
    }

    // Check if user is owner or has admin role
    const user = await User.findById(req.userId);
    if (document.uploadedBy.toString() !== req.userId && user.role !== 'admin') {
        return next(new AuthorizationError('Not authorized to delete this document'));
    }

    // Remove document from all users' bookmarks
    await User.updateMany(
        {},
        { $pull: { bookmarkedDocuments: id } }
    );

    // Remove from uploader's shared documents
    await User.findByIdAndUpdate(document.uploadedBy, {
        $pull: { documentsShared: id }
    });

    // Delete the document
    await Document.findByIdAndDelete(id);

    res.json({
        success: true,
        message: 'Document deleted successfully'
    });
});

/**
 * Toggle bookmark document
 */
const toggleBookmark = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
        return next(new NotFoundError('Document not found'));
    }

    const user = await User.findById(req.userId);
    
    // Initialize bookmarkedDocuments if it doesn't exist
    if (!user.bookmarkedDocuments) {
        user.bookmarkedDocuments = [];
    }

    const isBookmarked = user.bookmarkedDocuments.includes(id);

    if (isBookmarked) {
        // Remove bookmark
        user.bookmarkedDocuments.pull(id);
        document.bookmarks -= 1;
    } else {
        // Add bookmark
        user.bookmarkedDocuments.push(id);
        document.bookmarks += 1;
    }

    await Promise.all([user.save(), document.save()]);

    res.json({
        success: true,
        message: isBookmarked ? 'Bookmark removed' : 'Document bookmarked',
        data: {
            isBookmarked: !isBookmarked,
            bookmarksCount: document.bookmarks
        }
    });
});

/**
 * Download document
 */
const downloadDocument = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
        return next(new NotFoundError('Document not found'));
    }

    if (!document.fileUrl) {
        return next(new AppError('No file available for download', 400));
    }

    // Increment download count
    document.downloads += 1;
    await document.save();

    res.json({
        success: true,
        data: {
            downloadUrl: document.fileUrl,
            fileName: document.title,
            fileType: document.fileType,
            fileSize: document.fileSize
        }
    });
});

/**
 * Get featured documents
 */
const getFeaturedDocuments = catchAsync(async (req, res, next) => {
    const { limit = 6 } = req.query;

    const documents = await Document.find({
        isFeatured: true
    })
    .populate('uploadedBy', 'username fullName profilePicture role')
    .sort({ views: -1, bookmarks: -1 })
    .limit(parseInt(limit))
    .lean();

    res.json({
        success: true,
        data: {
            documents
        }
    });
});

/**
 * Get popular documents
 */
const getPopularDocuments = catchAsync(async (req, res, next) => {
    const { limit = 10, period = '30d' } = req.query;

    // Calculate date filter for period
    let dateFilter = {};
    if (period !== 'all') {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        dateFilter.createdAt = {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        };
    }

    const documents = await Document.find(dateFilter)
        .populate('uploadedBy', 'username fullName profilePicture role')
        .sort({ views: -1, downloads: -1, bookmarks: -1 })
        .limit(parseInt(limit))
        .lean();

    res.json({
        success: true,
        data: {
            documents
        }
    });
});

/**
 * Get document categories with count
 */
const getDocumentCategories = catchAsync(async (req, res, next) => {
    const categories = await Document.aggregate([
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalViews: { $sum: '$views' },
                totalDownloads: { $sum: '$downloads' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    res.json({
        success: true,
        data: {
            categories
        }
    });
});

/**
 * Search documents with advanced filters
 */
const searchDocuments = catchAsync(async (req, res, next) => {
    const {
        q,
        category,
        subject,
        tags,
        fileType,
        uploadedBy,
        dateFrom,
        dateTo,
        minViews,
        sort = 'relevance',
        page = 1,
        limit = 12
    } = req.query;

    // Build search filter
    const filter = {};

    if (q) {
        filter.$text = { $search: q };
    }

    if (category) filter.category = category;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (fileType) filter.fileType = fileType;
    if (uploadedBy) filter.uploadedBy = uploadedBy;
    if (minViews) filter.views = { $gte: parseInt(minViews) };

    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        filter.tags = { $in: tagArray };
    }

    if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Determine sort order
    let sortOrder;
    switch (sort) {
        case 'relevance':
            sortOrder = q ? { score: { $meta: 'textScore' } } : { views: -1 };
            break;
        case 'newest':
            sortOrder = { createdAt: -1 };
            break;
        case 'oldest':
            sortOrder = { createdAt: 1 };
            break;
        case 'popular':
            sortOrder = { views: -1, downloads: -1 };
            break;
        case 'alphabetical':
            sortOrder = { title: 1 };
            break;
        default:
            sortOrder = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute search
    const documents = await Document.find(filter)
        .populate('uploadedBy', 'username fullName profilePicture role')
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await Document.countDocuments(filter);

    res.json({
        success: true,
        data: {
            documents,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalDocuments: total,
                hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            },
            searchQuery: q,
            filters: { category, subject, tags, fileType, uploadedBy, dateFrom, dateTo, minViews }
        }
    });
});

/**
 * Get user's bookmarked documents
 */
const getBookmarkedDocuments = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 12 } = req.query;

    const user = await User.findById(req.userId).populate({
        path: 'bookmarkedDocuments',
        populate: {
            path: 'uploadedBy',
            select: 'username fullName profilePicture role'
        },
        options: {
            skip: (parseInt(page) - 1) * parseInt(limit),
            limit: parseInt(limit),
            sort: { createdAt: -1 }
        }
    });

    const total = user.bookmarkedDocuments?.length || 0;

    res.json({
        success: true,
        data: {
            documents: user.bookmarkedDocuments || [],
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalDocuments: total,
                hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            }
        }
    });
});

/**
 * Get document statistics
 */
const getDocumentStats = catchAsync(async (req, res, next) => {
    const stats = await Promise.all([
        Document.countDocuments(),
        Document.aggregate([
            { $group: { _id: null, totalViews: { $sum: '$views' }, totalDownloads: { $sum: '$downloads' } } }
        ]),
        Document.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Document.find({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).countDocuments()
    ]);

    res.json({
        success: true,
        data: {
            totalDocuments: stats[0],
            totalViews: stats[1][0]?.totalViews || 0,
            totalDownloads: stats[1][0]?.totalDownloads || 0,
            documentsByCategory: stats[2],
            documentsToday: stats[3]
        }
    });
});

module.exports = {
    getDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    toggleBookmark,
    downloadDocument,
    getFeaturedDocuments,
    getPopularDocuments,
    getDocumentCategories,
    searchDocuments,
    getBookmarkedDocuments,
    getDocumentStats
};