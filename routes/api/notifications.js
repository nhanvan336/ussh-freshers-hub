// Notifications API Routes
const express = require('express');
const router = express.Router();

// Import controllers
const notificationController = require('../../controllers/notificationController');

// Import middleware
const { authenticate, adminOnly } = require('../../middleware/auth');
const { 
    validateObjectId, 
    validatePagination,
    handleValidationErrors 
} = require('../../middleware/validation');
const { body, query } = require('express-validator');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination and filters
 * @access  Private
 */
router.get('/',
    authenticate,
    validatePagination,
    [
        query('unreadOnly')
            .optional()
            .isBoolean()
            .withMessage('unreadOnly must be a boolean'),
        query('type')
            .optional()
            .isIn(['system', 'forum', 'learning', 'wellness', 'chat'])
            .withMessage('Invalid notification type'),
        handleValidationErrors
    ],
    notificationController.getNotifications
);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats',
    authenticate,
    notificationController.getNotificationStats
);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read',
    authenticate,
    [
        validateObjectId('id'),
        handleValidationErrors
    ],
    notificationController.markAsRead
);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all',
    authenticate,
    notificationController.markAllAsRead
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id',
    authenticate,
    [
        validateObjectId('id'),
        handleValidationErrors
    ],
    notificationController.deleteNotification
);

/**
 * @route   DELETE /api/notifications
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete('/',
    authenticate,
    notificationController.clearAllNotifications
);

/**
 * @route   POST /api/notifications
 * @desc    Create notification (admin only)
 * @access  Private (Admin only)
 */
router.post('/',
    authenticate,
    adminOnly,
    [
        body('title')
            .isLength({ min: 1, max: 200 })
            .withMessage('Title must be between 1 and 200 characters'),
        body('message')
            .isLength({ min: 1, max: 1000 })
            .withMessage('Message must be between 1 and 1000 characters'),
        body('type')
            .optional()
            .isIn(['system', 'forum', 'learning', 'wellness', 'chat'])
            .withMessage('Invalid notification type'),
        body('userIds')
            .optional()
            .isArray()
            .withMessage('UserIds must be an array'),
        body('userIds.*')
            .optional()
            .isMongoId()
            .withMessage('Invalid user ID'),
        body('data')
            .optional()
            .isObject()
            .withMessage('Data must be an object'),
        body('expiresAt')
            .optional()
            .isISO8601()
            .withMessage('Invalid expiry date format'),
        handleValidationErrors
    ],
    notificationController.createNotification
);

/**
 * @route   GET /api/notifications/admin/connection-stats
 * @desc    Get real-time connection statistics
 * @access  Private (Admin only)
 */
router.get('/admin/connection-stats',
    authenticate,
    adminOnly,
    notificationController.getConnectionStats
);

/**
 * @route   GET /api/notifications/admin/online-users
 * @desc    Get list of online users
 * @access  Private (Admin only)
 */
router.get('/admin/online-users',
    authenticate,
    adminOnly,
    notificationController.getOnlineUsers
);

/**
 * @route   POST /api/notifications/admin/disconnect-user/:userId
 * @desc    Force disconnect a user
 * @access  Private (Admin only)
 */
router.post('/admin/disconnect-user/:userId',
    authenticate,
    adminOnly,
    [
        validateObjectId('userId'),
        body('reason')
            .optional()
            .isLength({ min: 1, max: 500 })
            .withMessage('Reason must be between 1 and 500 characters'),
        handleValidationErrors
    ],
    notificationController.forceDisconnectUser
);

/**
 * @route   POST /api/notifications/admin/broadcast
 * @desc    Broadcast system message to all users
 * @access  Private (Admin only)
 */
router.post('/admin/broadcast',
    authenticate,
    adminOnly,
    [
        body('message')
            .isLength({ min: 1, max: 1000 })
            .withMessage('Message must be between 1 and 1000 characters'),
        body('type')
            .optional()
            .isIn(['info', 'warning', 'error', 'success'])
            .withMessage('Invalid message type'),
        handleValidationErrors
    ],
    notificationController.broadcastSystemMessage
);

/**
 * @route   POST /api/notifications/admin/send-to-room
 * @desc    Send message to specific room
 * @access  Private (Admin only)
 */
router.post('/admin/send-to-room',
    authenticate,
    adminOnly,
    [
        body('roomId')
            .isLength({ min: 1, max: 100 })
            .withMessage('Room ID is required'),
        body('event')
            .isLength({ min: 1, max: 100 })
            .withMessage('Event name is required'),
        body('data')
            .isObject()
            .withMessage('Data must be an object'),
        handleValidationErrors
    ],
    notificationController.sendMessageToRoom
);

/**
 * @route   GET /api/notifications/room/:roomId/users
 * @desc    Get users in a specific room
 * @access  Private
 */
router.get('/room/:roomId/users',
    authenticate,
    [
        body('roomId')
            .isLength({ min: 1, max: 100 })
            .withMessage('Valid room ID is required'),
        handleValidationErrors
    ],
    notificationController.getUsersInRoom
);

module.exports = router;