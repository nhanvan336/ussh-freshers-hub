// Learning Hub API Routes
const express = require('express');
const router = express.Router();

// Import controllers
const learningController = require('../../controllers/learningController');

// Import middleware
const { authenticate, optionalAuth, adminOnly, authorize } = require('../../middleware/auth');
const {
    validateCourse,
    validateObjectId,
    validatePagination,
    validateSearch,
    handleValidationErrors
} = require('../../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/learning/courses
 * @desc    Get all courses with filters and pagination
 * @access  Public
 */
router.get('/courses',
    optionalAuth,
    validatePagination,
    validateSearch,
    learningController.getCourses
);

/**
 * @route   GET /api/learning/courses/featured
 * @desc    Get featured courses
 * @access  Public
 */
router.get('/courses/featured',
    optionalAuth,
    learningController.getFeaturedCourses
);

/**
 * @route   GET /api/learning/courses/categories
 * @desc    Get course categories with count
 * @access  Public
 */
router.get('/courses/categories', learningController.getCourseCategories);

/**
 * @route   GET /api/learning/courses/:id
 * @desc    Get single course details
 * @access  Public
 */
router.get('/courses/:id',
    optionalAuth,
    validateObjectId('id'),
    learningController.getCourse
);

/**
 * @route   POST /api/learning/courses
 * @desc    Create new course
 * @access  Private (Admin/Instructor only)
 */
router.post('/courses',
    authenticate,
    authorize('admin', 'instructor'),
    validateCourse,
    learningController.createCourse
);

/**
 * @route   PUT /api/learning/courses/:id
 * @desc    Update course
 * @access  Private (Admin/Instructor/Creator only)
 */
router.put('/courses/:id',
    authenticate,
    validateObjectId('id'),
    validateCourse,
    learningController.updateCourse
);

/**
 * @route   DELETE /api/learning/courses/:id
 * @desc    Delete course
 * @access  Private (Admin/Creator only)
 */
router.delete('/courses/:id',
    authenticate,
    validateObjectId('id'),
    learningController.deleteCourse
);

/**
 * @route   POST /api/learning/courses/:id/enroll
 * @desc    Enroll in course
 * @access  Private
 */
router.post('/courses/:id/enroll',
    authenticate,
    validateObjectId('id'),
    learningController.enrollCourse
);

/**
 * @route   DELETE /api/learning/courses/:id/enroll
 * @desc    Unenroll from course
 * @access  Private
 */
router.delete('/courses/:id/enroll',
    authenticate,
    validateObjectId('id'),
    learningController.unenrollCourse
);

/**
 * @route   PUT /api/learning/courses/:id/progress
 * @desc    Update course progress
 * @access  Private
 */
router.put('/courses/:id/progress',
    authenticate,
    validateObjectId('id'),
    [
        body('lessonId')
            .notEmpty()
            .withMessage('Lesson ID is required'),
        body('completed')
            .isBoolean()
            .withMessage('Completed must be a boolean'),
        handleValidationErrors
    ],
    learningController.updateProgress
);

/**
 * @route   POST /api/learning/courses/:id/rate
 * @desc    Rate course
 * @access  Private
 */
router.post('/courses/:id/rate',
    authenticate,
    validateObjectId('id'),
    [
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('review')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Review must not exceed 1000 characters'),
        handleValidationErrors
    ],
    learningController.rateCourse
);

/**
 * @route   GET /api/learning/my-courses
 * @desc    Get user's enrolled courses
 * @access  Private
 */
router.get('/my-courses',
    authenticate,
    learningController.getEnrolledCourses
);

/**
 * @route   GET /api/learning/stats
 * @desc    Get learning statistics
 * @access  Private
 */
router.get('/stats',
    authenticate,
    learningController.getLearningStats
);

module.exports = router;