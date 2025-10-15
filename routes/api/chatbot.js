// Chatbot API Routes
const express = require('express');
const router = express.Router();

// Import controllers
const chatbotController = require('../../controllers/chatbotController');

// Import middleware
const { authenticate, adminOnly } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validation');
const { body, query } = require('express-validator');

/**
 * @route   POST /api/chatbot/message
 * @desc    Send message to chatbot
 * @access  Private
 */
router.post('/message',
    authenticate,
    [
        body('message')
            .isLength({ min: 1, max: 1000 })
            .withMessage('Message must be between 1 and 1000 characters')
            .trim(),
        handleValidationErrors
    ],
    chatbotController.sendMessage
);

/**
 * @route   GET /api/chatbot/history
 * @desc    Get conversation history
 * @access  Private
 */
router.get('/history',
    authenticate,
    [
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        handleValidationErrors
    ],
    chatbotController.getConversationHistory
);

/**
 * @route   DELETE /api/chatbot/history
 * @desc    Clear conversation history
 * @access  Private
 */
router.delete('/history',
    authenticate,
    chatbotController.clearConversation
);

/**
 * @route   GET /api/chatbot/suggestions
 * @desc    Get chatbot suggestions and commands
 * @access  Private
 */
router.get('/suggestions',
    authenticate,
    chatbotController.getSuggestions
);

/**
 * @route   GET /api/chatbot/info
 * @desc    Get chatbot information and capabilities
 * @access  Public
 */
router.get('/info', chatbotController.getChatbotInfo);

/**
 * @route   POST /api/chatbot/feedback
 * @desc    Provide feedback on chatbot response
 * @access  Private
 */
router.post('/feedback',
    authenticate,
    [
        body('messageId')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('Invalid message ID'),
        body('rating')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('feedback')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Feedback must not exceed 500 characters'),
        body('responseHelpful')
            .optional()
            .isBoolean()
            .withMessage('Response helpful must be a boolean'),
        handleValidationErrors
    ],
    chatbotController.provideFeedback
);

/**
 * @route   GET /api/chatbot/admin/analytics
 * @desc    Get chatbot analytics and usage statistics
 * @access  Private (Admin only)
 */
router.get('/admin/analytics',
    authenticate,
    adminOnly,
    [
        query('timeRange')
            .optional()
            .isIn(['1d', '7d', '30d', '90d'])
            .withMessage('Time range must be 1d, 7d, 30d, or 90d'),
        handleValidationErrors
    ],
    chatbotController.getChatbotAnalytics
);

/**
 * @route   POST /api/chatbot/admin/reset
 * @desc    Reset chatbot for all users
 * @access  Private (Admin only)
 */
router.post('/admin/reset',
    authenticate,
    adminOnly,
    chatbotController.resetChatbot
);

/**
 * @route   POST /api/chatbot/admin/broadcast
 * @desc    Broadcast message from chatbot to users
 * @access  Private (Admin only)
 */
router.post('/admin/broadcast',
    authenticate,
    adminOnly,
    [
        body('message')
            .isLength({ min: 1, max: 1000 })
            .withMessage('Message must be between 1 and 1000 characters')
            .trim(),
        body('targetUsers')
            .optional()
            .custom((value) => {
                if (value === 'all') return true;
                if (Array.isArray(value)) {
                    return value.every(id => typeof id === 'string' && id.length > 0);
                }
                return false;
            })
            .withMessage('Target users must be "all" or array of user IDs'),
        handleValidationErrors
    ],
    chatbotController.broadcastMessage
);

/**
 * @route   GET /api/chatbot/admin/popular-queries
 * @desc    Get popular chatbot queries for analysis
 * @access  Private (Admin only)
 */
router.get('/admin/popular-queries',
    authenticate,
    adminOnly,
    [
        query('limit')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('Limit must be between 1 and 50'),
        handleValidationErrors
    ],
    chatbotController.getPopularQueries
);

module.exports = router;