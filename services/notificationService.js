// Notification Service
const User = require('../models/User');

class NotificationService {
    constructor(socketService) {
        this.socketService = socketService;
        this.notificationQueue = new Map(); // userId -> Array of notifications
        this.setupPeriodicCleanup();
    }

    // Create notification
    async createNotification(userId, notification) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const newNotification = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data || {},
                isRead: false,
                createdAt: new Date(),
                expiresAt: notification.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            };

            // Add to user's notifications in database
            if (!user.notifications) {
                user.notifications = [];
            }
            
            user.notifications.unshift(newNotification);
            
            // Keep only last 100 notifications
            if (user.notifications.length > 100) {
                user.notifications = user.notifications.slice(0, 100);
            }

            await user.save();

            // Send real-time notification if user is online
            if (this.socketService) {
                this.socketService.sendNotificationToUser(userId, newNotification);
            }

            // Add to queue if user is offline
            if (!this.socketService?.connectedUsers.has(userId)) {
                this.addToQueue(userId, newNotification);
            }

            return newNotification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    // Create notification for multiple users
    async createNotificationForUsers(userIds, notification) {
        const promises = userIds.map(userId => 
            this.createNotification(userId, notification)
        );
        
        return Promise.allSettled(promises);
    }

    // Create notification for all users (system-wide)
    async createSystemNotification(notification, excludeUserIds = []) {
        try {
            const users = await User.find({
                _id: { $nin: excludeUserIds },
                isActive: true
            }).select('_id');

            const userIds = users.map(user => user._id.toString());
            return await this.createNotificationForUsers(userIds, {
                ...notification,
                type: 'system'
            });
        } catch (error) {
            console.error('Error creating system notification:', error);
            throw error;
        }
    }

    // Get user notifications with pagination
    async getUserNotifications(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                unreadOnly = false,
                type = null
            } = options;

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            let notifications = user.notifications || [];

            // Filter by read status
            if (unreadOnly) {
                notifications = notifications.filter(n => !n.isRead);
            }

            // Filter by type
            if (type) {
                notifications = notifications.filter(n => n.type === type);
            }

            // Remove expired notifications
            const now = new Date();
            notifications = notifications.filter(n => 
                !n.expiresAt || new Date(n.expiresAt) > now
            );

            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedNotifications = notifications.slice(startIndex, endIndex);

            // Count unread
            const unreadCount = notifications.filter(n => !n.isRead).length;

            return {
                notifications: paginatedNotifications,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(notifications.length / limit),
                    totalNotifications: notifications.length,
                    hasNext: endIndex < notifications.length,
                    hasPrev: page > 1
                },
                unreadCount
            };
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    // Mark notification as read
    async markAsRead(userId, notificationId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const notification = user.notifications?.find(n => n.id === notificationId);
            if (!notification) {
                throw new Error('Notification not found');
            }

            notification.isRead = true;
            notification.readAt = new Date();

            await user.save();

            // Send real-time update
            if (this.socketService) {
                this.socketService.sendNotificationToUser(userId, {
                    type: 'notification-read',
                    notificationId,
                    timestamp: new Date()
                });
            }

            return notification;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    // Mark all notifications as read
    async markAllAsRead(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.notifications) {
                user.notifications.forEach(notification => {
                    if (!notification.isRead) {
                        notification.isRead = true;
                        notification.readAt = new Date();
                    }
                });

                await user.save();
            }

            // Send real-time update
            if (this.socketService) {
                this.socketService.sendNotificationToUser(userId, {
                    type: 'all-notifications-read',
                    timestamp: new Date()
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    // Delete notification
    async deleteNotification(userId, notificationId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.notifications) {
                user.notifications = user.notifications.filter(n => n.id !== notificationId);
                await user.save();
            }

            // Send real-time update
            if (this.socketService) {
                this.socketService.sendNotificationToUser(userId, {
                    type: 'notification-deleted',
                    notificationId,
                    timestamp: new Date()
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    // Clear all notifications
    async clearAllNotifications(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.notifications = [];
            await user.save();

            // Send real-time update
            if (this.socketService) {
                this.socketService.sendNotificationToUser(userId, {
                    type: 'all-notifications-cleared',
                    timestamp: new Date()
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error clearing all notifications:', error);
            throw error;
        }
    }

    // Add notification to offline queue
    addToQueue(userId, notification) {
        if (!this.notificationQueue.has(userId)) {
            this.notificationQueue.set(userId, []);
        }
        
        const userQueue = this.notificationQueue.get(userId);
        userQueue.push(notification);

        // Keep only last 50 queued notifications
        if (userQueue.length > 50) {
            this.notificationQueue.set(userId, userQueue.slice(-50));
        }
    }

    // Send queued notifications when user comes online
    async sendQueuedNotifications(userId) {
        const userQueue = this.notificationQueue.get(userId);
        if (!userQueue || userQueue.length === 0) {
            return;
        }

        // Send all queued notifications
        for (const notification of userQueue) {
            if (this.socketService) {
                this.socketService.sendNotificationToUser(userId, notification);
            }
        }

        // Clear the queue
        this.notificationQueue.delete(userId);
    }

    // Specific notification creators
    async createForumNotification(userId, type, data) {
        const notificationMap = {
            'post-liked': {
                title: 'Post Liked',
                message: `${data.likerName} liked your post "${data.postTitle}"`
            },
            'post-commented': {
                title: 'New Comment',
                message: `${data.commenterName} commented on your post "${data.postTitle}"`
            },
            'comment-replied': {
                title: 'Comment Reply',
                message: `${data.replierName} replied to your comment`
            },
            'post-mentioned': {
                title: 'You were mentioned',
                message: `${data.mentionerName} mentioned you in a post`
            }
        };

        const notificationTemplate = notificationMap[type];
        if (!notificationTemplate) {
            throw new Error(`Unknown forum notification type: ${type}`);
        }

        return await this.createNotification(userId, {
            type: 'forum',
            title: notificationTemplate.title,
            message: notificationTemplate.message,
            data: data
        });
    }

    async createLearningNotification(userId, type, data) {
        const notificationMap = {
            'course-enrolled': {
                title: 'Course Enrollment',
                message: `You enrolled in "${data.courseTitle}"`
            },
            'lesson-completed': {
                title: 'Lesson Completed',
                message: `You completed "${data.lessonTitle}" in ${data.courseTitle}`
            },
            'course-completed': {
                title: 'Course Completed',
                message: `Congratulations! You completed "${data.courseTitle}"`
            },
            'assignment-due': {
                title: 'Assignment Due',
                message: `Assignment "${data.assignmentTitle}" is due soon`
            },
            'new-course-available': {
                title: 'New Course Available',
                message: `Check out the new course: "${data.courseTitle}"`
            }
        };

        const notificationTemplate = notificationMap[type];
        if (!notificationTemplate) {
            throw new Error(`Unknown learning notification type: ${type}`);
        }

        return await this.createNotification(userId, {
            type: 'learning',
            title: notificationTemplate.title,
            message: notificationTemplate.message,
            data: data
        });
    }

    async createWellnessNotification(userId, type, data) {
        const notificationMap = {
            'wellness-reminder': {
                title: 'Wellness Check-in',
                message: `Time for your ${data.activityType} check-in`
            },
            'streak-milestone': {
                title: 'Wellness Milestone',
                message: `Great job! You've maintained a ${data.streakDays}-day wellness streak`
            },
            'goal-completed': {
                title: 'Goal Achieved',
                message: `Congratulations! You completed your goal: "${data.goalTitle}"`
            },
            'wellness-tip': {
                title: 'Wellness Tip',
                message: data.tipMessage
            }
        };

        const notificationTemplate = notificationMap[type];
        if (!notificationTemplate) {
            throw new Error(`Unknown wellness notification type: ${type}`);
        }

        return await this.createNotification(userId, {
            type: 'wellness',
            title: notificationTemplate.title,
            message: notificationTemplate.message,
            data: data
        });
    }

    // Cleanup expired notifications
    setupPeriodicCleanup() {
        setInterval(async () => {
            try {
                const now = new Date();
                await User.updateMany(
                    {},
                    {
                        $pull: {
                            notifications: {
                                expiresAt: { $lt: now }
                            }
                        }
                    }
                );
                console.log('🧹 Cleaned up expired notifications');
            } catch (error) {
                console.error('Error cleaning up notifications:', error);
            }
        }, 24 * 60 * 60 * 1000); // Run daily
    }

    // Get notification statistics
    async getNotificationStats(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const notifications = user.notifications || [];
            const now = new Date();
            const activeNotifications = notifications.filter(n => 
                !n.expiresAt || new Date(n.expiresAt) > now
            );

            const stats = {
                total: activeNotifications.length,
                unread: activeNotifications.filter(n => !n.isRead).length,
                byType: {},
                recent: activeNotifications.filter(n => 
                    new Date(n.createdAt) > new Date(now - 7 * 24 * 60 * 60 * 1000)
                ).length
            };

            // Count by type
            activeNotifications.forEach(notification => {
                const type = notification.type;
                stats.byType[type] = (stats.byType[type] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting notification stats:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;