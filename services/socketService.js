// Real-time Socket Service
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ForumPost = require('../models/ForumPost');
const { JWT_SECRET } = require('../middleware/auth');

class SocketService {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map(); // userId -> {socketId, userData}
        this.userSockets = new Map(); // socketId -> userId
        this.roomUsers = new Map(); // roomId -> Set of userIds
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Socket connected: ${socket.id}`);

            // Handle user authentication
            socket.on('authenticate', async (data) => {
                try {
                    await this.authenticateSocket(socket, data.token);
                } catch (error) {
                    console.error('Socket authentication error:', error);
                    socket.emit('auth-error', { message: 'Authentication failed' });
                }
            });

            // Handle joining rooms
            socket.on('join-room', (data) => {
                this.handleJoinRoom(socket, data.roomId, data.roomType);
            });

            // Handle leaving rooms
            socket.on('leave-room', (data) => {
                this.handleLeaveRoom(socket, data.roomId);
            });

            // Forum real-time features
            socket.on('forum-typing', (data) => {
                this.handleForumTyping(socket, data);
            });

            socket.on('forum-stop-typing', (data) => {
                this.handleForumStopTyping(socket, data);
            });

            // Live chat features
            socket.on('chat-message', (data) => {
                this.handleChatMessage(socket, data);
            });

            socket.on('chat-typing', (data) => {
                this.handleChatTyping(socket, data);
            });

            socket.on('chat-stop-typing', (data) => {
                this.handleChatStopTyping(socket, data);
            });

            // Learning progress updates
            socket.on('learning-progress-update', (data) => {
                this.handleLearningProgressUpdate(socket, data);
            });

            // Wellness check-ins
            socket.on('wellness-checkin', (data) => {
                this.handleWellnessCheckin(socket, data);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            // Heartbeat for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
        });
    }

    // Authenticate socket connection
    async authenticateSocket(socket, token) {
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user || !user.isActive) {
            throw new Error('Invalid user');
        }

        // Store user info
        this.connectedUsers.set(user._id.toString(), {
            socketId: socket.id,
            userData: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePicture: user.profilePicture,
                role: user.role
            },
            connectedAt: new Date()
        });

        this.userSockets.set(socket.id, user._id.toString());

        // Update user's online status
        await User.findByIdAndUpdate(user._id, {
            isOnline: true,
            lastSeen: new Date()
        });

        socket.emit('authenticated', {
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName
            }
        });

        // Notify friends about online status
        this.broadcastUserStatus(user._id.toString(), 'online');

        console.log(`✅ User authenticated: ${user.username} (${socket.id})`);
    }

    // Handle joining rooms
    handleJoinRoom(socket, roomId, roomType = 'general') {
        const userId = this.userSockets.get(socket.id);
        if (!userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }

        socket.join(roomId);

        // Track users in room
        if (!this.roomUsers.has(roomId)) {
            this.roomUsers.set(roomId, new Set());
        }
        this.roomUsers.get(roomId).add(userId);

        // Notify others in room
        socket.to(roomId).emit('user-joined-room', {
            roomId,
            user: this.connectedUsers.get(userId)?.userData,
            timestamp: new Date()
        });

        // Send room info to user
        socket.emit('joined-room', {
            roomId,
            roomType,
            usersCount: this.roomUsers.get(roomId).size,
            timestamp: new Date()
        });

        console.log(`📝 User ${userId} joined room: ${roomId}`);
    }

    // Handle leaving rooms
    handleLeaveRoom(socket, roomId) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        socket.leave(roomId);

        // Remove from room tracking
        if (this.roomUsers.has(roomId)) {
            this.roomUsers.get(roomId).delete(userId);
            if (this.roomUsers.get(roomId).size === 0) {
                this.roomUsers.delete(roomId);
            }
        }

        // Notify others
        socket.to(roomId).emit('user-left-room', {
            roomId,
            user: this.connectedUsers.get(userId)?.userData,
            timestamp: new Date()
        });

        console.log(`📤 User ${userId} left room: ${roomId}`);
    }

    // Handle forum typing indicators
    handleForumTyping(socket, data) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        const { postId } = data;
        socket.to(`forum-post-${postId}`).emit('user-typing', {
            postId,
            user: this.connectedUsers.get(userId)?.userData,
            timestamp: new Date()
        });
    }

    handleForumStopTyping(socket, data) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        const { postId } = data;
        socket.to(`forum-post-${postId}`).emit('user-stop-typing', {
            postId,
            user: this.connectedUsers.get(userId)?.userData,
            timestamp: new Date()
        });
    }

    // Handle live chat messages
    handleChatMessage(socket, data) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        const { roomId, message, messageType = 'text' } = data;
        
        const chatMessage = {
            id: Date.now().toString(),
            roomId,
            message,
            messageType,
            sender: this.connectedUsers.get(userId)?.userData,
            timestamp: new Date()
        };

        // Broadcast to room
        this.io.to(roomId).emit('chat-message', chatMessage);

        console.log(`💬 Chat message in ${roomId} from ${userId}: ${message.substring(0, 50)}...`);
    }

    // Handle chat typing indicators
    handleChatTyping(socket, data) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        const { roomId } = data;
        socket.to(roomId).emit('user-typing', {
            user: this.connectedUsers.get(userId)?.userData,
            timestamp: new Date()
        });
    }

    handleChatStopTyping(socket, data) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        const { roomId } = data;
        socket.to(roomId).emit('user-stop-typing', {
            user: this.connectedUsers.get(userId)?.userData,
            timestamp: new Date()
        });
    }

    // Handle learning progress updates
    handleLearningProgressUpdate(socket, data) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        const { courseId, lessonId, progress } = data;
        
        // Broadcast to course room
        socket.to(`course-${courseId}`).emit('progress-update', {
            user: this.connectedUsers.get(userId)?.userData,
            courseId,
            lessonId,
            progress,
            timestamp: new Date()
        });

        // Send notification to user's connections
        this.sendNotificationToUser(userId, {
            type: 'learning-progress',
            title: 'Learning Progress',
            message: `Made progress in course`,
            data: { courseId, progress }
        });
    }

    // Handle wellness check-ins
    handleWellnessCheckin(socket, data) {
        const userId = this.userSockets.get(socket.id);
        if (!userId) return;

        const { type, mood, message } = data;

        // Broadcast to wellness community (if user opted in)
        socket.to('wellness-community').emit('wellness-checkin', {
            user: this.connectedUsers.get(userId)?.userData,
            type,
            mood,
            message,
            timestamp: new Date()
        });
    }

    // Handle disconnect
    async handleDisconnect(socket) {
        const userId = this.userSockets.get(socket.id);
        
        if (userId) {
            console.log(`👋 User disconnected: ${userId} (${socket.id})`);

            // Update user's offline status
            await User.findByIdAndUpdate(userId, {
                isOnline: false,
                lastSeen: new Date()
            });

            // Remove from tracking
            this.connectedUsers.delete(userId);
            this.userSockets.delete(socket.id);

            // Remove from all rooms
            for (const [roomId, users] of this.roomUsers.entries()) {
                if (users.has(userId)) {
                    users.delete(userId);
                    socket.to(roomId).emit('user-left-room', {
                        roomId,
                        userId,
                        timestamp: new Date()
                    });
                    
                    if (users.size === 0) {
                        this.roomUsers.delete(roomId);
                    }
                }
            }

            // Notify friends about offline status
            this.broadcastUserStatus(userId, 'offline');
        }
    }

    // Send notification to specific user
    sendNotificationToUser(userId, notification) {
        const userConnection = this.connectedUsers.get(userId);
        if (userConnection) {
            this.io.to(userConnection.socketId).emit('notification', {
                ...notification,
                id: Date.now().toString(),
                timestamp: new Date()
            });
        }
    }

    // Send notification to multiple users
    sendNotificationToUsers(userIds, notification) {
        userIds.forEach(userId => {
            this.sendNotificationToUser(userId, notification);
        });
    }

    // Broadcast to room
    broadcastToRoom(roomId, event, data) {
        this.io.to(roomId).emit(event, {
            ...data,
            timestamp: new Date()
        });
    }

    // Broadcast user status change
    broadcastUserStatus(userId, status) {
        // Get user's friends/connections and notify them
        const userConnection = this.connectedUsers.get(userId);
        if (userConnection) {
            this.io.emit('user-status-change', {
                userId,
                status,
                user: userConnection.userData,
                timestamp: new Date()
            });
        }
    }

    // Get online users count
    getOnlineUsersCount() {
        return this.connectedUsers.size;
    }

    // Get users in room
    getUsersInRoom(roomId) {
        const users = this.roomUsers.get(roomId);
        if (!users) return [];

        return Array.from(users).map(userId => {
            const connection = this.connectedUsers.get(userId);
            return connection ? connection.userData : null;
        }).filter(Boolean);
    }

    // Get all connected users (admin only)
    getAllConnectedUsers() {
        return Array.from(this.connectedUsers.values()).map(conn => ({
            ...conn.userData,
            connectedAt: conn.connectedAt,
            socketId: conn.socketId
        }));
    }

    // Force disconnect user (admin only)
    forceDisconnectUser(userId, reason = 'Admin action') {
        const userConnection = this.connectedUsers.get(userId);
        if (userConnection) {
            this.io.to(userConnection.socketId).emit('force-disconnect', {
                reason,
                timestamp: new Date()
            });
            this.io.sockets.sockets.get(userConnection.socketId)?.disconnect(true);
        }
    }

    // Broadcast system announcement
    broadcastSystemMessage(message, type = 'info') {
        this.io.emit('system-message', {
            message,
            type,
            timestamp: new Date()
        });
    }
}

module.exports = SocketService;