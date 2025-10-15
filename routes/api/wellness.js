// Wellness API Routes
const express = require('express');
const router = express.Router();

// Import controllers
const wellnessController = require('../../controllers/wellnessController');

// Import middleware
const { authenticate } = require('../../middleware/auth');
const {
    validateWellnessEntry,
    validateObjectId,
    validatePagination,
    handleValidationErrors
} = require('../../middleware/validation');
const { body, query } = require('express-validator');

/**
 * @route   GET /api/wellness/entries
 * @desc    Get user's wellness entries with pagination and filters
 * @access  Private
 */
router.get('/entries',
    authenticate,
    validatePagination,
    [
        query('type')
            .optional()
            .isIn(['mood', 'activity', 'goal', 'reflection'])
            .withMessage('Invalid entry type'),
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid start date format'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid end date format'),
        handleValidationErrors
    ],
    wellnessController.getWellnessEntries
);

/**
 * @route   POST /api/wellness/entries
 * @desc    Create new wellness entry
 * @access  Private
 */
router.post('/entries',
    authenticate,
    validateWellnessEntry,
    wellnessController.createWellnessEntry
);

/**
 * @route   PUT /api/wellness/entries/:id
 * @desc    Update wellness entry
 * @access  Private
 */
router.put('/entries/:id',
    authenticate,
    validateObjectId('id'),
    validateWellnessEntry,
    wellnessController.updateWellnessEntry
);

/**
 * @route   DELETE /api/wellness/entries/:id
 * @desc    Delete wellness entry
 * @access  Private
 */
router.delete('/entries/:id',
    authenticate,
    validateObjectId('id'),
    wellnessController.deleteWellnessEntry
);

/**
 * @route   GET /api/wellness/stats
 * @desc    Get wellness statistics and insights
 * @access  Private
 */
router.get('/stats',
    authenticate,
    [
        query('period')
            .optional()
            .isIn(['7d', '30d', '90d'])
            .withMessage('Period must be 7d, 30d, or 90d'),
        handleValidationErrors
    ],
    wellnessController.getWellnessStats
);

/**
 * @route   GET /api/wellness/mood-trends
 * @desc    Get mood trends over time
 * @access  Private
 */
router.get('/mood-trends',
    authenticate,
    [
        query('days')
            .optional()
            .isInt({ min: 1, max: 365 })
            .withMessage('Days must be between 1 and 365'),
        handleValidationErrors
    ],
    wellnessController.getMoodTrends
);

/**
 * @route   GET /api/wellness/goals
 * @desc    Get wellness goals and progress
 * @access  Private
 */
router.get('/goals',
    authenticate,
    wellnessController.getWellnessGoals
);

/**
 * @route   PUT /api/wellness/goals/:id/complete
 * @desc    Mark a wellness goal as completed
 * @access  Private
 */
router.put('/goals/:id/complete',
    authenticate,
    validateObjectId('id'),
    wellnessController.completeGoal
);

/**
 * @route   GET /api/wellness/recommendations
 * @desc    Get personalized wellness recommendations
 * @access  Private
 */
router.get('/recommendations',
    authenticate,
    wellnessController.getRecommendations
);

/**
 * @route   GET /api/wellness/reminders
 * @desc    Get wellness reminders
 * @access  Private
 */
router.get('/reminders',
    authenticate,
    wellnessController.getReminders
);

/**
 * @route   POST /api/wellness/reminders
 * @desc    Set wellness reminder
 * @access  Private
 */
router.post('/reminders',
    authenticate,
    [
        body('title')
            .isLength({ min: 1, max: 100 })
            .withMessage('Title must be between 1 and 100 characters')
            .trim(),
        body('time')
            .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Time must be in HH:mm format'),
        body('frequency')
            .isIn(['daily', 'weekly', 'monthly'])
            .withMessage('Frequency must be daily, weekly, or monthly'),
        body('isActive')
            .optional()
            .isBoolean()
            .withMessage('isActive must be a boolean'),
        handleValidationErrors
    ],
    wellnessController.setReminder
);

module.exports = router;