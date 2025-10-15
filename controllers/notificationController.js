// Notification Controller
const { catchAsync, NotFoundError } = require('../middleware/errorHandler');

/**
 * Get user notifications
 */
const getNotifications = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type
    } = req.query;

    if (!global.notificationService) {
        return res.status(503).json({
            success: false,
            message: 'Notification service unavailable'
        });
    }

    const result = await global.notificationService.getUserNotifications(req.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unreadOnly === 'true',
        type
    });

    res.json({
        success: true,
        data: result
    });
});

/**
 * Mark notification as read
 */
const markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!global.notificationService) {
        return res.status(503).json({
            success: false,
            message: 'Notification service unavailable'
        });
    }

    const notification = await global.notificationService.markAsRead(req.userId, id);

    res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification }
    });
});

/**
 * Mark all notifications as read
 */
const markAllAsRead = catchAsync(async (req, res, next) => {
    if (!global.notificationService) {
        return res.status(503).json({
            success: false,
            message: 'Notification service unavailable'
        });
    }

    await global.notificationService.markAllAsRead(req.userId);

    res.json({
        success: true,
        message: 'All notifications marked as read'
    });
});

/**
 * Delete notification
 */
const deleteNotification = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!global.notificationService) {
        return res.status(503).json({
            success: false,
            message: 'Notification service unavailable'
        });
    }

    await global.notificationService.deleteNotification(req.userId, id);

    res.json({
        success: true,
        message: 'Notification deleted'
    });
});

/**
 * Clear all notifications
 */
const clearAllNotifications = catchAsync(async (req, res, next) => {
    if (!global.notificationService) {
        return res.status(503).json({
            success: false,
            message: 'Notification service unavailable'
        });
    }

    await global.notificationService.clearAllNotifications(req.userId);

    res.json({
        success: true,
        message: 'All notifications cleared'
    });
});

/**
 * Get notification statistics
 */
const getNotificationStats = catchAsync(async (req, res, next) => {
    if (!global.notificationService) {
        return res.status(503).json({
            success: false,
            message: 'Notification service unavailable'
        });
    }

    const stats = await global.notificationService.getNotificationStats(req.userId);

    res.json({
        success: true,
        data: { stats }
    });
});

/**
 * Create notification (admin only)
 */
const createNotification = catchAsync(async (req, res, next) => {
    const { userIds, title, message, type, data, expiresAt } = req.body;

    if (!global.notificationService) {
        return res.status(503).json({
            success: false,
            message: 'Notification service unavailable'
        });
    }

    const notification = {
        title,
        message,
        type: type || 'system',
        data: data || {},
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
    };

    let result;
    if (!userIds || userIds.length === 0) {
        // System-wide notification
        result = await global.notificationService.createSystemNotification(notification);
    } else if (Array.isArray(userIds)) {
        // Multiple users
        result = await global.notificationService.createNotificationForUsers(userIds, notification);
    } else {
        // Single user
        result = await global.notificationService.createNotification(userIds, notification);
    }

    res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { result }
    });
});

/**
 * Get real-time connection stats (admin only)
 */
const getConnectionStats = catchAsync(async (req, res, next) => {
    if (!global.socketService) {
        return res.status(503).json({
            success: false,
            message: 'Socket service unavailable'
        });
    }

    const stats = {
        onlineUsers: global.socketService.getOnlineUsersCount(),
        activeRooms: Array.from(global.socketService.roomUsers.keys()).map(roomId => ({
            roomId,
            userCount: global.socketService.getUsersInRoom(roomId).length
        })),
        serverUptime: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage()
    };

    res.json({
        success: true,
        data: { stats }
    });
});

/**
 * Get online users (admin only)
 */
const getOnlineUsers = catchAsync(async (req, res, next) => {
    if (!global.socketService) {
        return res.status(503).json({
            success: false,
            message: 'Socket service unavailable'
        });
    }

    const onlineUsers = global.socketService.getAllConnectedUsers();

    res.json({
        success: true,
        data: { onlineUsers }
    });
});

/**
 * Force disconnect user (admin only)
 */
const forceDisconnectUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { reason = 'Administrative action' } = req.body;

    if (!global.socketService) {
        return res.status(503).json({
            success: false,
            message: 'Socket service unavailable'
        });
    }

    global.socketService.forceDisconnectUser(userId, reason);

    res.json({
        success: true,
        message: 'User disconnected successfully'
    });
});

/**
 * Broadcast system message (admin only)
 */
const broadcastSystemMessage = catchAsync(async (req, res, next) => {
    const { message, type = 'info' } = req.body;

    if (!global.socketService) {
        return res.status(503).json({
            success: false,
            message: 'Socket service unavailable'
        });
    }

    global.socketService.broadcastSystemMessage(message, type);

    res.json({
        success: true,
        message: 'System message broadcasted successfully'
    });
});

/**
 * Send message to room (admin only)
 */
const sendMessageToRoom = catchAsync(async (req, res, next) => {
    const { roomId, event, data } = req.body;

    if (!global.socketService) {
        return res.status(503).json({
            success: false,
            message: 'Socket service unavailable'
        });
    }

    global.socketService.broadcastToRoom(roomId, event, data);

    res.json({
        success: true,
        message: `Message sent to room ${roomId}`
    });
});

/**
 * Get users in room
 */
const getUsersInRoom = catchAsync(async (req, res, next) => {
    const { roomId } = req.params;

    if (!global.socketService) {
        return res.status(503).json({
            success: false,
            message: 'Socket service unavailable'
        });
    }

    const users = global.socketService.getUsersInRoom(roomId);

    res.json({
        success: true,
        data: { 
            roomId,
            users,
            userCount: users.length
        }
    });
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationStats,
    createNotification,
    getConnectionStats,
    getOnlineUsers,
    forceDisconnectUser,
    broadcastSystemMessage,
    sendMessageToRoom,
    getUsersInRoom
};