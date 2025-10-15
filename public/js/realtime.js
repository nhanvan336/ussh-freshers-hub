// Real-time Client Integration
class RealtimeService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.currentUser = null;
        this.currentRooms = new Set();
        this.eventHandlers = new Map();
        
        this.init();
    }

    // Initialize socket connection
    init() {
        // Load Socket.IO if not already loaded
        if (typeof io === 'undefined') {
            this.loadSocketIO(() => {
                this.connect();
            });
        } else {
            this.connect();
        }
    }

    // Load Socket.IO library
    loadSocketIO(callback) {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = callback;
        script.onerror = () => {
            console.error('Failed to load Socket.IO library');
        };
        document.head.appendChild(script);
    }

    // Connect to socket server
    connect() {
        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true
            });

            this.setupEventHandlers();
            this.setupConnectionHandlers();
        } catch (error) {
            console.error('Socket connection error:', error);
        }
    }

    // Setup connection event handlers
    setupConnectionHandlers() {
        this.socket.on('connect', () => {
            console.log('🔌 Connected to real-time server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Authenticate if user token is available
            const token = this.getAuthToken();
            if (token) {
                this.authenticate(token);
            }

            this.emit('connection-established');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected from server:', reason);
            this.isConnected = false;
            this.emit('connection-lost', { reason });
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.handleReconnect();
        });

        this.socket.on('authenticated', (data) => {
            console.log('✅ Authenticated:', data.user.username);
            this.currentUser = data.user;
            this.emit('authenticated', data);
        });

        this.socket.on('auth-error', (data) => {
            console.error('❌ Authentication failed:', data.message);
            this.emit('auth-error', data);
        });

        this.socket.on('force-disconnect', (data) => {
            console.warn('⚠️ Force disconnected:', data.reason);
            this.emit('force-disconnect', data);
        });
    }

    // Setup application event handlers
    setupEventHandlers() {
        // Notification handlers
        this.socket.on('notification', (notification) => {
            this.handleNotification(notification);
        });

        this.socket.on('notification-read', (data) => {
            this.emit('notification-read', data);
        });

        this.socket.on('all-notifications-read', (data) => {
            this.emit('all-notifications-read', data);
        });

        // Forum handlers
        this.socket.on('user-typing', (data) => {
            this.emit('user-typing', data);
        });

        this.socket.on('user-stop-typing', (data) => {
            this.emit('user-stop-typing', data);
        });

        this.socket.on('new-comment', (data) => {
            this.emit('new-comment', data);
        });

        this.socket.on('post-liked', (data) => {
            this.emit('post-liked', data);
        });

        // Chat handlers
        this.socket.on('chat-message', (message) => {
            this.emit('chat-message', message);
        });

        // Learning handlers
        this.socket.on('progress-update', (data) => {
            this.emit('progress-update', data);
        });

        this.socket.on('new-enrollment', (data) => {
            this.emit('new-enrollment', data);
        });

        // Wellness handlers
        this.socket.on('wellness-checkin', (data) => {
            this.emit('wellness-checkin', data);
        });

        this.socket.on('goal-achievement', (data) => {
            this.emit('goal-achievement', data);
        });

        // Room handlers
        this.socket.on('user-joined-room', (data) => {
            this.emit('user-joined-room', data);
        });

        this.socket.on('user-left-room', (data) => {
            this.emit('user-left-room', data);
        });

        this.socket.on('joined-room', (data) => {
            console.log(`📝 Joined room: ${data.roomId}`);
            this.currentRooms.add(data.roomId);
            this.emit('joined-room', data);
        });

        // System handlers
        this.socket.on('system-message', (data) => {
            this.handleSystemMessage(data);
        });

        this.socket.on('user-status-change', (data) => {
            this.emit('user-status-change', data);
        });

        // Heartbeat
        this.socket.on('pong', (data) => {
            this.emit('heartbeat', data);
        });
    }

    // Authenticate with server
    authenticate(token) {
        if (this.socket && this.isConnected) {
            this.socket.emit('authenticate', { token });
        }
    }

    // Join a room
    joinRoom(roomId, roomType = 'general') {
        if (this.socket && this.isConnected) {
            this.socket.emit('join-room', { roomId, roomType });
        }
    }

    // Leave a room
    leaveRoom(roomId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave-room', { roomId });
            this.currentRooms.delete(roomId);
        }
    }

    // Send chat message
    sendChatMessage(roomId, message, messageType = 'text') {
        if (this.socket && this.isConnected) {
            this.socket.emit('chat-message', {
                roomId,
                message,
                messageType
            });
        }
    }

    // Send typing indicator
    sendTyping(roomId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('chat-typing', { roomId });
        }
    }

    // Stop typing indicator
    stopTyping(roomId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('chat-stop-typing', { roomId });
        }
    }

    // Forum typing indicators
    sendForumTyping(postId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('forum-typing', { postId });
        }
    }

    stopForumTyping(postId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('forum-stop-typing', { postId });
        }
    }

    // Update learning progress
    updateLearningProgress(courseId, lessonId, progress) {
        if (this.socket && this.isConnected) {
            this.socket.emit('learning-progress-update', {
                courseId,
                lessonId,
                progress
            });
        }
    }

    // Send wellness check-in
    sendWellnessCheckin(type, mood, message) {
        if (this.socket && this.isConnected) {
            this.socket.emit('wellness-checkin', {
                type,
                mood,
                message
            });
        }
    }

    // Send heartbeat
    sendHeartbeat() {
        if (this.socket && this.isConnected) {
            this.socket.emit('ping');
        }
    }

    // Handle notifications
    handleNotification(notification) {
        console.log('🔔 New notification:', notification.title);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id
            });
        }

        // Show in-app notification
        this.showInAppNotification(notification);

        // Emit for app-specific handling
        this.emit('notification', notification);
    }

    // Show in-app notification
    showInAppNotification(notification) {
        const notificationContainer = document.querySelector('.notification-container') || 
                                    this.createNotificationContainer();

        const notificationElement = document.createElement('div');
        notificationElement.className = `notification notification-${notification.type}`;
        notificationElement.innerHTML = `
            <div class="notification-content">
                <h4 class="notification-title">${notification.title}</h4>
                <p class="notification-message">${notification.message}</p>
                <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
            </div>
            <button class="notification-close" aria-label="Close notification">&times;</button>
        `;

        // Add click handler for close button
        notificationElement.querySelector('.notification-close').addEventListener('click', () => {
            notificationElement.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.remove();
            }
        }, 5000);

        notificationContainer.appendChild(notificationElement);

        // Trigger animation
        requestAnimationFrame(() => {
            notificationElement.classList.add('notification-show');
        });
    }

    // Create notification container
    createNotificationContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }

    // Handle system messages
    handleSystemMessage(data) {
        console.log(`📢 System message (${data.type}):`, data.message);
        
        // Show system message banner
        this.showSystemBanner(data.message, data.type);
        
        this.emit('system-message', data);
    }

    // Show system banner
    showSystemBanner(message, type) {
        // Remove existing banner
        const existingBanner = document.querySelector('.system-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.className = `system-banner system-banner-${type}`;
        banner.innerHTML = `
            <div class="system-banner-content">
                <span class="system-banner-message">${message}</span>
                <button class="system-banner-close" aria-label="Close banner">&times;</button>
            </div>
        `;

        banner.querySelector('.system-banner-close').addEventListener('click', () => {
            banner.remove();
        });

        // Insert at top of page
        document.body.insertBefore(banner, document.body.firstChild);

        // Auto-remove after 10 seconds for info messages
        if (type === 'info') {
            setTimeout(() => {
                if (banner.parentNode) {
                    banner.remove();
                }
            }, 10000);
        }
    }

    // Handle reconnection
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.emit('connection-failed');
        }
    }

    // Get auth token from localStorage or cookies
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('accessToken') ||
               this.getCookie('authToken');
    }

    // Get cookie value
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Format timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    // Event system
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Disconnect
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentRooms.clear();
    }

    // Get connection status
    getStatus() {
        return {
            isConnected: this.isConnected,
            currentUser: this.currentUser,
            currentRooms: Array.from(this.currentRooms),
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    requestNotificationPermission();

    // Create global realtime service instance
    window.realtimeService = new RealtimeService();

    // Add connection status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'connection-status';
    statusIndicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        padding: 8px 12px;
        border-radius: 20px;
        background: #28a745;
        color: white;
        font-size: 12px;
        z-index: 1000;
        display: none;
    `;
    statusIndicator.textContent = '🔌 Connected';
    document.body.appendChild(statusIndicator);

    // Update status indicator
    window.realtimeService.on('connection-established', () => {
        statusIndicator.style.background = '#28a745';
        statusIndicator.textContent = '🔌 Connected';
        statusIndicator.style.display = 'block';
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 3000);
    });

    window.realtimeService.on('connection-lost', () => {
        statusIndicator.style.background = '#dc3545';
        statusIndicator.textContent = '🔌 Disconnected';
        statusIndicator.style.display = 'block';
    });

    window.realtimeService.on('connection-failed', () => {
        statusIndicator.style.background = '#dc3545';
        statusIndicator.textContent = '❌ Connection Failed';
        statusIndicator.style.display = 'block';
    });

    console.log('🚀 Real-time service initialized');
});

// Add CSS for notifications and system banners
const style = document.createElement('style');
style.textContent = `
    .notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 10px;
        padding: 15px;
        border-left: 4px solid var(--primary-brown);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        position: relative;
    }

    .notification-show {
        opacity: 1;
        transform: translateX(0);
    }

    .notification-forum {
        border-left-color: #007bff;
    }

    .notification-learning {
        border-left-color: #28a745;
    }

    .notification-wellness {
        border-left-color: #17a2b8;
    }

    .notification-system {
        border-left-color: #ffc107;
    }

    .notification-title {
        margin: 0 0 5px 0;
        font-size: 14px;
        font-weight: 600;
        color: #333;
    }

    .notification-message {
        margin: 0 0 5px 0;
        font-size: 13px;
        color: #666;
        line-height: 1.4;
    }

    .notification-time {
        font-size: 11px;
        color: #999;
    }

    .notification-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 18px;
        color: #999;
        cursor: pointer;
        line-height: 1;
    }

    .notification-close:hover {
        color: #333;
    }

    .system-banner {
        background: #007bff;
        color: white;
        padding: 12px 20px;
        position: relative;
        z-index: 9999;
    }

    .system-banner-warning {
        background: #ffc107;
        color: #212529;
    }

    .system-banner-error {
        background: #dc3545;
    }

    .system-banner-success {
        background: #28a745;
    }

    .system-banner-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 1200px;
        margin: 0 auto;
    }

    .system-banner-message {
        font-size: 14px;
        font-weight: 500;
    }

    .system-banner-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
        line-height: 1;
        opacity: 0.8;
    }

    .system-banner-close:hover {
        opacity: 1;
    }

    .connection-status {
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);