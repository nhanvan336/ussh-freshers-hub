// Chatbot UI Component
class ChatbotUI {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.messages = [];
        this.isTyping = false;
        this.suggestions = [];
        this.authToken = this.getAuthToken();
        
        this.init();
    }

    // Initialize chatbot UI
    init() {
        this.createChatbotButton();
        this.createChatbotWidget();
        this.setupEventListeners();
        this.loadSuggestions();
        this.loadConversationHistory();
    }

    // Create floating chatbot button
    createChatbotButton() {
        const button = document.createElement('div');
        button.className = 'chatbot-button';
        button.innerHTML = `
            <div class="chatbot-button-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                    <path d="M8.5 11C9.33 11 10 10.33 10 9.5C10 8.67 9.33 8 8.5 8C7.67 8 7 8.67 7 9.5C7 10.33 7.67 11 8.5 11Z" fill="currentColor"/>
                    <path d="M15.5 11C16.33 11 17 10.33 17 9.5C17 8.67 16.33 8 15.5 8C14.67 8 14 8.67 14 9.5C14 10.33 14.67 11 15.5 11Z" fill="currentColor"/>
                    <path d="M12 17.5C14.33 17.5 16.31 16.04 17 14H7C7.69 16.04 9.67 17.5 12 17.5Z" fill="currentColor"/>
                </svg>
            </div>
            <div class="chatbot-button-pulse"></div>
        `;
        
        button.addEventListener('click', () => this.toggleChatbot());
        document.body.appendChild(button);
        
        this.chatbotButton = button;
    }

    // Create chatbot widget
    createChatbotWidget() {
        const widget = document.createElement('div');
        widget.className = 'chatbot-widget';
        widget.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-info">
                    <div class="chatbot-avatar">
                        <span>🤖</span>
                    </div>
                    <div class="chatbot-title">
                        <h4>USSH Assistant</h4>
                        <span class="chatbot-status">Online</span>
                    </div>
                </div>
                <div class="chatbot-header-actions">
                    <button class="chatbot-minimize" aria-label="Minimize">−</button>
                    <button class="chatbot-close" aria-label="Close">×</button>
                </div>
            </div>
            
            <div class="chatbot-messages" id="chatbot-messages">
                <div class="chatbot-welcome">
                    <div class="welcome-message">
                        <h5>👋 Welcome to USSH Assistant!</h5>
                        <p>I'm here to help you navigate the freshers' hub. Ask me about courses, forum posts, wellness tips, or anything else!</p>
                    </div>
                </div>
            </div>
            
            <div class="chatbot-suggestions" id="chatbot-suggestions">
                <!-- Suggestions will be loaded here -->
            </div>
            
            <div class="chatbot-typing" id="chatbot-typing" style="display: none;">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="typing-text">Assistant is typing...</span>
            </div>
            
            <div class="chatbot-input">
                <div class="chatbot-input-container">
                    <textarea 
                        id="chatbot-input-field" 
                        placeholder="Type your message..."
                        rows="1"
                        maxlength="1000"
                    ></textarea>
                    <button id="chatbot-send-btn" class="chatbot-send-btn" aria-label="Send message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="chatbot-input-footer">
                    <span class="char-count">0/1000</span>
                    <span class="chatbot-tips">Try typing "/" for commands</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(widget);
        this.chatbotWidget = widget;
        
        // Setup widget event listeners
        this.setupWidgetEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Real-time service integration
        if (window.realtimeService) {
            window.realtimeService.on('chatbot-response', (response) => {
                this.addMessage(response, 'bot');
                this.hideTyping();
            });

            window.realtimeService.on('chatbot-error', (error) => {
                this.addMessage({
                    message: error.message,
                    type: 'error'
                }, 'bot');
                this.hideTyping();
            });

            window.realtimeService.on('chatbot-broadcast', (broadcast) => {
                this.addMessage(broadcast, 'bot');
                if (!this.isOpen) {
                    this.showNotificationBadge();
                }
            });
        }

        // Auto-resize on window resize
        window.addEventListener('resize', () => {
            this.adjustWidgetSize();
        });
    }

    // Setup widget-specific event listeners
    setupWidgetEventListeners() {
        // Header actions
        this.chatbotWidget.querySelector('.chatbot-minimize').addEventListener('click', () => {
            this.minimizeChatbot();
        });

        this.chatbotWidget.querySelector('.chatbot-close').addEventListener('click', () => {
            this.closeChatbot();
        });

        // Input handling
        const inputField = this.chatbotWidget.querySelector('#chatbot-input-field');
        const sendBtn = this.chatbotWidget.querySelector('#chatbot-send-btn');

        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        inputField.addEventListener('input', (e) => {
            this.updateCharCount();
            this.autoResize(e.target);
            this.updateSendButtonState();
        });

        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Auto-focus input when widget opens
        this.chatbotWidget.addEventListener('transitionend', () => {
            if (this.isOpen && !this.isMinimized) {
                inputField.focus();
            }
        });
    }

    // Toggle chatbot visibility
    toggleChatbot() {
        if (this.isOpen) {
            this.closeChatbot();
        } else {
            this.openChatbot();
        }
    }

    // Open chatbot
    openChatbot() {
        this.isOpen = true;
        this.isMinimized = false;
        this.chatbotWidget.classList.add('chatbot-open');
        this.chatbotButton.classList.add('chatbot-active');
        this.hideNotificationBadge();
        this.scrollToBottom();
        
        // Focus input field
        setTimeout(() => {
            this.chatbotWidget.querySelector('#chatbot-input-field').focus();
        }, 300);
    }

    // Close chatbot
    closeChatbot() {
        this.isOpen = false;
        this.isMinimized = false;
        this.chatbotWidget.classList.remove('chatbot-open', 'chatbot-minimized');
        this.chatbotButton.classList.remove('chatbot-active');
    }

    // Minimize chatbot
    minimizeChatbot() {
        this.isMinimized = true;
        this.chatbotWidget.classList.add('chatbot-minimized');
    }

    // Send message
    async sendMessage() {
        const inputField = this.chatbotWidget.querySelector('#chatbot-input-field');
        const message = inputField.value.trim();

        if (!message) return;

        // Add user message to chat
        this.addMessage({ message, type: 'user' }, 'user');
        inputField.value = '';
        this.updateCharCount();
        this.updateSendButtonState();
        this.autoResize(inputField);

        // Show typing indicator
        this.showTyping();

        try {
            // Send via real-time service if available
            if (window.realtimeService && window.realtimeService.isConnected) {
                window.realtimeService.socket.emit('chatbot-message', {
                    message,
                    userId: this.getCurrentUserId()
                });
            } else {
                // Fallback to HTTP API
                const response = await this.sendMessageAPI(message);
                this.addMessage(response, 'bot');
                this.hideTyping();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage({
                message: 'Sorry, I\'m having trouble connecting. Please try again.',
                type: 'error'
            }, 'bot');
            this.hideTyping();
        }
    }

    // Send message via API
    async sendMessageAPI(message) {
        const response = await fetch('/api/chatbot/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const data = await response.json();
        return data.data;
    }

    // Add message to chat
    addMessage(messageData, sender) {
        const messagesContainer = this.chatbotWidget.querySelector('#chatbot-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `chatbot-message chatbot-message-${sender}`;
        
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (sender === 'user') {
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(messageData.message)}</div>
                    <div class="message-time">${timestamp}</div>
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-text">${this.formatBotMessage(messageData)}</div>
                    <div class="message-time">${timestamp}</div>
                    ${this.createMessageActions(messageData)}
                </div>
            `;
        }

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Store message
        this.messages.push({ ...messageData, sender, timestamp: new Date() });
    }

    // Format bot message based on type
    formatBotMessage(messageData) {
        let content = this.escapeHtml(messageData.message);

        // Add special formatting based on message type
        switch (messageData.type) {
            case 'courses':
                content += this.formatCoursesData(messageData.data);
                break;
            case 'forum':
                content += this.formatForumData(messageData.data);
                break;
            case 'documents':
                content += this.formatDocumentsData(messageData.data);
                break;
            case 'profile':
                content += this.formatProfileData(messageData.data);
                break;
            case 'stats':
                content += this.formatStatsData(messageData.data);
                break;
            case 'help':
                content += this.formatHelpData(messageData.data);
                break;
        }

        return content;
    }

    // Format courses data
    formatCoursesData(data) {
        if (!data.courses || data.courses.length === 0) return '';

        return `
            <div class="chatbot-data-list">
                ${data.courses.map(course => `
                    <div class="data-item course-item">
                        <h6>${course.title}</h6>
                        <p>👨‍🏫 ${course.instructor} • ${course.difficulty} • ${course.enrollments} enrolled</p>
                        <button class="btn-small" onclick="window.location.href='/learning-hub/course/${course.id}'">
                            View Course
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Format forum data
    formatForumData(data) {
        if (!data.posts || data.posts.length === 0) return '';

        return `
            <div class="chatbot-data-list">
                ${data.posts.map(post => `
                    <div class="data-item forum-item">
                        <h6>${post.title}</h6>
                        <p>✍️ ${post.author} • 👍 ${post.likes} • 💬 ${post.commentsCount}</p>
                        <button class="btn-small" onclick="window.location.href='/forum/post/${post.id}'">
                            Read Post
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Format documents data
    formatDocumentsData(data) {
        if (!data.documents || data.documents.length === 0) return '';

        return `
            <div class="chatbot-data-list">
                ${data.documents.map(doc => `
                    <div class="data-item document-item">
                        <h6>${doc.title}</h6>
                        <p>📂 ${doc.category} • 👁️ ${doc.views} views</p>
                        <button class="btn-small" onclick="window.location.href='/handbook/document/${doc.id}'">
                            View Document
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Format profile data
    formatProfileData(data) {
        return `
            <div class="chatbot-profile">
                <div class="profile-stats">
                    <div class="stat-item">📚 ${data.enrolledCourses} courses</div>
                    <div class="stat-item">💬 ${data.forumPosts} posts</div>
                    <div class="stat-item">💚 ${data.wellnessStreak} day streak</div>
                </div>
            </div>
        `;
    }

    // Format stats data
    formatStatsData(data) {
        return `
            <div class="chatbot-stats">
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${data.coursesEnrolled}</span>
                        <span class="stat-label">Courses</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${data.forumPosts}</span>
                        <span class="stat-label">Posts</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${data.wellnessStreak}</span>
                        <span class="stat-label">Day Streak</span>
                    </div>
                </div>
                ${data.achievements && data.achievements.length > 0 ? `
                    <div class="achievements">
                        <h6>🏆 Achievements:</h6>
                        <div class="achievement-tags">
                            ${data.achievements.map(achievement => `
                                <span class="achievement-tag">${achievement}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Format help data
    formatHelpData(data) {
        return `
            <div class="chatbot-help">
                <div class="help-section">
                    <h6>💻 Commands:</h6>
                    <div class="command-list">
                        ${data.commands.map(cmd => `
                            <div class="command-item">
                                <code>${cmd.command}</code>
                                <span>${cmd.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="help-section">
                    <h6>⚡ Quick Actions:</h6>
                    <div class="quick-actions">
                        ${data.quickActions.map(action => `
                            <button class="quick-action-btn" onclick="chatbotUI.sendQuickAction('${action}')">
                                ${action}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Create message actions
    createMessageActions(messageData) {
        return `
            <div class="message-actions">
                <button class="message-action-btn" onclick="chatbotUI.copyMessage('${messageData.message}')" title="Copy">
                    📋
                </button>
                <button class="message-action-btn" onclick="chatbotUI.provideFeedback(true)" title="Helpful">
                    👍
                </button>
                <button class="message-action-btn" onclick="chatbotUI.provideFeedback(false)" title="Not helpful">
                    👎
                </button>
            </div>
        `;
    }

    // Load suggestions
    async loadSuggestions() {
        try {
            const response = await fetch('/api/chatbot/suggestions', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.suggestions = data.data;
                this.displaySuggestions();
            }
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    }

    // Display suggestions
    displaySuggestions() {
        const suggestionsContainer = this.chatbotWidget.querySelector('#chatbot-suggestions');
        
        if (this.suggestions.quickActions) {
            suggestionsContainer.innerHTML = `
                <div class="suggestions-header">💡 Try these:</div>
                <div class="suggestion-chips">
                    ${this.suggestions.quickActions.slice(0, 4).map(action => `
                        <button class="suggestion-chip" onclick="chatbotUI.sendQuickAction('${action.action}')">
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            `;
        }
    }

    // Send quick action
    sendQuickAction(action) {
        const inputField = this.chatbotWidget.querySelector('#chatbot-input-field');
        inputField.value = action;
        this.sendMessage();
    }

    // Show/hide typing indicator
    showTyping() {
        this.isTyping = true;
        this.chatbotWidget.querySelector('#chatbot-typing').style.display = 'flex';
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        this.chatbotWidget.querySelector('#chatbot-typing').style.display = 'none';
    }

    // Utility functions
    updateCharCount() {
        const inputField = this.chatbotWidget.querySelector('#chatbot-input-field');
        const charCount = this.chatbotWidget.querySelector('.char-count');
        charCount.textContent = `${inputField.value.length}/1000`;
    }

    updateSendButtonState() {
        const inputField = this.chatbotWidget.querySelector('#chatbot-input-field');
        const sendBtn = this.chatbotWidget.querySelector('#chatbot-send-btn');
        sendBtn.disabled = !inputField.value.trim();
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        const messagesContainer = this.chatbotWidget.querySelector('#chatbot-messages');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('accessToken') ||
               this.getCookie('authToken');
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    getCurrentUserId() {
        // Get user ID from token or session
        try {
            const token = this.getAuthToken();
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.userId;
            }
        } catch (error) {
            console.error('Error getting user ID:', error);
        }
        return null;
    }

    // Additional features
    copyMessage(message) {
        navigator.clipboard.writeText(message).then(() => {
            this.showToast('Message copied to clipboard');
        });
    }

    provideFeedback(helpful) {
        // Send feedback to API
        fetch('/api/chatbot/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify({
                responseHelpful: helpful,
                timestamp: new Date()
            })
        }).then(() => {
            this.showToast(helpful ? 'Thanks for the positive feedback!' : 'Thanks for the feedback, I\'ll improve!');
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'chatbot-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }

    showNotificationBadge() {
        this.chatbotButton.classList.add('has-notification');
    }

    hideNotificationBadge() {
        this.chatbotButton.classList.remove('has-notification');
    }

    adjustWidgetSize() {
        // Adjust widget size for mobile
        if (window.innerWidth <= 768) {
            this.chatbotWidget.classList.add('mobile-fullscreen');
        } else {
            this.chatbotWidget.classList.remove('mobile-fullscreen');
        }
    }

    async loadConversationHistory() {
        try {
            const response = await fetch('/api/chatbot/history?limit=10', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Load previous messages if needed
                console.log('Conversation history loaded:', data.data.history.length, 'messages');
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
        }
    }
}

// Initialize chatbot UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatbotUI = new ChatbotUI();
    console.log('🤖 Chatbot UI initialized');
});