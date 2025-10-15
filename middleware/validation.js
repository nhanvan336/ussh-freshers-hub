// Validation Middleware
const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    
    next();
};

/**
 * User registration validation
 */
const validateUserRegistration = [
    body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('fullName')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .trim(),
    
    body('studentId')
        .optional()
        .matches(/^[0-9]{8,12}$/)
        .withMessage('Student ID must be 8-12 digits'),
    
    body('faculty')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Faculty name must be between 2 and 100 characters'),
    
    body('year')
        .optional()
        .isInt({ min: 1, max: 6 })
        .withMessage('Year must be between 1 and 6'),
    
    handleValidationErrors
];

/**
 * User login validation
 */
const validateUserLogin = [
    body('identifier')
        .notEmpty()
        .withMessage('Email or username is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

/**
 * Forum post validation
 */
const validateForumPost = [
    body('title')
        .isLength({ min: 5, max: 200 })
        .withMessage('Post title must be between 5 and 200 characters')
        .trim(),
    
    body('content')
        .isLength({ min: 10, max: 10000 })
        .withMessage('Post content must be between 10 and 10,000 characters')
        .trim(),
    
    body('category')
        .isIn(['general', 'academic', 'social', 'tech', 'career', 'wellness'])
        .withMessage('Invalid category'),
    
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    
    body('tags.*')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Each tag must be between 1 and 50 characters'),
    
    handleValidationErrors
];

/**
 * Comment validation
 */
const validateComment = [
    body('content')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Comment must be between 1 and 1,000 characters')
        .trim(),
    
    body('parentComment')
        .optional()
        .isMongoId()
        .withMessage('Invalid parent comment ID'),
    
    handleValidationErrors
];

/**
 * Course validation
 */
const validateCourse = [
    body('title')
        .isLength({ min: 5, max: 200 })
        .withMessage('Course title must be between 5 and 200 characters')
        .trim(),
    
    body('description')
        .isLength({ min: 20, max: 2000 })
        .withMessage('Description must be between 20 and 2,000 characters')
        .trim(),
    
    body('instructor')
        .isLength({ min: 2, max: 100 })
        .withMessage('Instructor name must be between 2 and 100 characters')
        .trim(),
    
    body('category')
        .isIn(['programming', 'design', 'business', 'language', 'science', 'other'])
        .withMessage('Invalid category'),
    
    body('difficulty')
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Invalid difficulty level'),
    
    body('duration')
        .isInt({ min: 1 })
        .withMessage('Duration must be a positive number'),
    
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    
    handleValidationErrors
];

/**
 * Document validation
 */
const validateDocument = [
    body('title')
        .isLength({ min: 3, max: 200 })
        .withMessage('Document title must be between 3 and 200 characters')
        .trim(),
    
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1,000 characters')
        .trim(),
    
    body('category')
        .isIn(['lecture-notes', 'assignments', 'exams', 'projects', 'references', 'other'])
        .withMessage('Invalid category'),
    
    body('subject')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Subject must be between 2 and 100 characters'),
    
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    
    handleValidationErrors
];

/**
 * Wellness entry validation
 */
const validateWellnessEntry = [
    body('type')
        .isIn(['mood', 'activity', 'goal', 'reflection'])
        .withMessage('Invalid wellness entry type'),
    
    body('data')
        .isObject()
        .withMessage('Data must be an object'),
    
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters'),
    
    handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (field = 'id') => [
    param(field)
        .isMongoId()
        .withMessage(`Invalid ${field} format`),
    
    handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('sort')
        .optional()
        .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'title', '-title', 'likes', '-likes'])
        .withMessage('Invalid sort field'),
    
    handleValidationErrors
];

/**
 * Search validation
 */
const validateSearch = [
    query('q')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters')
        .trim(),
    
    query('category')
        .optional()
        .isAlpha()
        .withMessage('Category must contain only letters'),
    
    query('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    
    handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        }),
    
    handleValidationErrors
];

/**
 * Profile update validation
 */
const validateProfileUpdate = [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .trim(),
    
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Bio must not exceed 500 characters')
        .trim(),
    
    body('faculty')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Faculty name must be between 2 and 100 characters'),
    
    body('year')
        .optional()
        .isInt({ min: 1, max: 6 })
        .withMessage('Year must be between 1 and 6'),
    
    body('interests')
        .optional()
        .isArray()
        .withMessage('Interests must be an array'),
    
    body('socialLinks')
        .optional()
        .isObject()
        .withMessage('Social links must be an object'),
    
    handleValidationErrors
];

/**
 * Rating validation
 */
const validateRating = [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    
    body('review')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Review must not exceed 500 characters')
        .trim(),
    
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateUserRegistration,
    validateUserLogin,
    validateForumPost,
    validateComment,
    validateCourse,
    validateDocument,
    validateWellnessEntry,
    validateObjectId,
    validatePagination,
    validateSearch,
    validatePasswordChange,
    validateProfileUpdate,
    validateRating
};