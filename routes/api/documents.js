// Documents API Routes (Handbook)
const express = require('express');
const router = express.Router();

// Import controllers
const documentsController = require('../../controllers/documentsController');

// Import middleware
const { authenticate, optionalAuth, moderatorOrAdmin } = require('../../middleware/auth');
const {
    validateDocument,
    validateObjectId,
    validatePagination,
    validateSearch,
    handleValidationErrors
} = require('../../middleware/validation');
const { query } = require('express-validator');

/**
 * @route   GET /api/documents
 * @desc    Get all documents with pagination and filters
 * @access  Public
 */
router.get('/',
    optionalAuth,
    validatePagination,
    validateSearch,
    [
        query('category')
            .optional()
            .isIn(['lecture-notes', 'assignments', 'exams', 'projects', 'references', 'other'])
            .withMessage('Invalid category'),
        query('subject')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('Subject must be between 1 and 100 characters'),
        query('tags')
            .optional()
            .custom((value) => {
                if (typeof value === 'string') return true;
                if (Array.isArray(value)) return true;
                return false;
            })
            .withMessage('Tags must be a string or array'),
        handleValidationErrors
    ],
    documentsController.getDocuments
);

/**
 * @route   GET /api/documents/featured
 * @desc    Get featured documents
 * @access  Public
 */
router.get('/featured',
    optionalAuth,
    documentsController.getFeaturedDocuments
);

/**
 * @route   GET /api/documents/popular
 * @desc    Get popular documents
 * @access  Public
 */
router.get('/popular',
    optionalAuth,
    [
        query('period')
            .optional()
            .isIn(['7d', '30d', '90d', 'all'])
            .withMessage('Period must be 7d, 30d, 90d, or all'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('Limit must be between 1 and 50'),
        handleValidationErrors
    ],
    documentsController.getPopularDocuments
);

/**
 * @route   GET /api/documents/categories
 * @desc    Get document categories with count
 * @access  Public
 */
router.get('/categories', documentsController.getDocumentCategories);

/**
 * @route   GET /api/documents/search
 * @desc    Advanced document search
 * @access  Public
 */
router.get('/search',
    optionalAuth,
    [
        query('q')
            .optional()
            .isLength({ min: 1, max: 200 })
            .withMessage('Search query must be between 1 and 200 characters'),
        query('category')
            .optional()
            .isIn(['lecture-notes', 'assignments', 'exams', 'projects', 'references', 'other'])
            .withMessage('Invalid category'),
        query('subject')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('Subject must be between 1 and 100 characters'),
        query('fileType')
            .optional()
            .isIn(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'md', 'other'])
            .withMessage('Invalid file type'),
        query('uploadedBy')
            .optional()
            .isMongoId()
            .withMessage('Invalid user ID'),
        query('dateFrom')
            .optional()
            .isISO8601()
            .withMessage('Invalid date format'),
        query('dateTo')
            .optional()
            .isISO8601()
            .withMessage('Invalid date format'),
        query('minViews')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Minimum views must be a positive number'),
        query('sort')
            .optional()
            .isIn(['relevance', 'newest', 'oldest', 'popular', 'alphabetical'])
            .withMessage('Invalid sort option'),
        validatePagination,
        handleValidationErrors
    ],
    documentsController.searchDocuments
);

/**
 * @route   GET /api/documents/my-bookmarks
 * @desc    Get user's bookmarked documents
 * @access  Private
 */
router.get('/my-bookmarks',
    authenticate,
    validatePagination,
    documentsController.getBookmarkedDocuments
);

/**
 * @route   GET /api/documents/stats
 * @desc    Get document statistics
 * @access  Public
 */
router.get('/stats', documentsController.getDocumentStats);

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document
 * @access  Public
 */
router.get('/:id',
    optionalAuth,
    validateObjectId('id'),
    documentsController.getDocument
);

/**
 * @route   POST /api/documents
 * @desc    Create new document
 * @access  Private
 */
router.post('/',
    authenticate,
    validateDocument,
    documentsController.createDocument
);

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document
 * @access  Private (Owner/Moderator/Admin)
 */
router.put('/:id',
    authenticate,
    validateObjectId('id'),
    validateDocument,
    documentsController.updateDocument
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document
 * @access  Private (Owner/Admin)
 */
router.delete('/:id',
    authenticate,
    validateObjectId('id'),
    documentsController.deleteDocument
);

/**
 * @route   POST /api/documents/:id/bookmark
 * @desc    Toggle bookmark document
 * @access  Private
 */
router.post('/:id/bookmark',
    authenticate,
    validateObjectId('id'),
    documentsController.toggleBookmark
);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download document
 * @access  Public
 */
router.get('/:id/download',
    validateObjectId('id'),
    documentsController.downloadDocument
);

module.exports = router;