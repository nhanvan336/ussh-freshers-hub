const fetch = require('node-fetch');
const User = require('../models/User');
const ForumPost = require('../models/ForumPost');
const Course = require('../models/Course');
const Document = require('../models/Document');

class ChatbotService {
    constructor() {
        this.conversationHistory = new Map();
        this.contextCache = new Map();
        this.commandHandlers = new Map();
        this.setupCommandHandlers();
        this.setupPeriodicCleanup();
    }

    // Giữ nguyên toàn bộ các hàm gốc của bạn
    setupCommandHandlers() {
        this.commandHandlers.set('help', this.handleHelpCommand.bind(this));
        this.commandHandlers.set('courses', this.handleCoursesCommand.bind(this));
        this.commandHandlers.set('forum', this.handleForumCommand.bind(this));
        this.commandHandlers.set('wellness', this.handleWellnessCommand.bind(this));
        this.commandHandlers.set('documents', this.handleDocumentsCommand.bind(this));
        this.commandHandlers.set('profile', this.handleProfileCommand.bind(this));
        this.commandHandlers.set('search', this.handleSearchCommand.bind(this));
        this.commandHandlers.set('schedule', this.handleScheduleCommand.bind(this));
        this.commandHandlers.set('stats', this.handleStatsCommand.bind(this));
        this.commandHandlers.set('clear', this.handleClearCommand.bind(this));
    }

    async processMessage(message, userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return this.createErrorResponse('User not found');
            }

            const cleanMessage = message.trim();
            
            if (!this.conversationHistory.has(userId)) {
                this.conversationHistory.set(userId, []);
            }
            
            const history = this.conversationHistory.get(userId);
            
            history.push({
                role: 'user',
                parts: [{ text: cleanMessage }],
                timestamp: new Date()
            });

            if (history.length > 10) {
                this.conversationHistory.set(userId, history.slice(-10));
            }

            if (cleanMessage.toLowerCase().startsWith('/')) {
                return await this.handleCommand(cleanMessage, userId, user);
            }

            const quickAction = this.detectQuickAction(cleanMessage.toLowerCase());
            if (quickAction) {
                return await this.handleQuickAction(quickAction, cleanMessage, userId, user);
            }

            return await this.handleGeneralConversation(cleanMessage, userId, user);

        } catch (error) {
            console.error('Chatbot processing error:', error);
            return this.createErrorResponse('Sorry, I encountered an error. Please try again.');
        }
    }

    // [NÂNG CẤP] Kết nối với Gemini AI
    async handleGeneralConversation(message, userId, user) {
        const userHistory = this.conversationHistory.get(userId) || [];

        try {
            const apiKey = process.env.GEMINI_API_KEY || "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const systemPrompt = "Bạn là USSH Assistant, một trợ lý AI thân thiện và hữu ích dành cho sinh viên trường Đại học Khoa học Xã hội và Nhân văn, ĐHQG Hà Nội. Nhiệm vụ của bạn là trả lời các câu hỏi liên quan đến đời sống sinh viên, học tập, quy chế, các địa điểm trong trường. Luôn trả lời bằng tiếng Việt một cách ngắn gọn, rõ ràng và lịch sự. Không trả lời các câu hỏi không liên quan.";
            
            const payload = {
                contents: userHistory.map(h => ({ role: h.role, parts: h.parts })),
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
            };

            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!apiResponse.ok) {
                console.error('Gemini API response error:', await apiResponse.text());
                throw new Error(`Gemini API error: ${apiResponse.statusText}`);
            }

            const result = await apiResponse.json();
            const botResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (botResponseText) {
                userHistory.push({ role: "model", parts: [{ text: botResponseText }], timestamp: new Date() });
                this.conversationHistory.set(userId, userHistory);
                return this.createResponse(botResponseText, 'text');
            } else {
                throw new Error('Không nhận được câu trả lời hợp lệ từ AI.');
            }

        } catch (error) {
            console.error('Chatbot Service error:', error);
            return this.createErrorResponse('Rất tiếc, đã có lỗi xảy ra khi kết nối với trợ lý AI.');
        }
    }

    // --- Các hàm còn lại của bạn được giữ nguyên ---
    async handleCommand(message, userId, user) {
        const parts = message.substring(1).split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        if (this.commandHandlers.has(command)) {
            return await this.commandHandlers.get(command)(args, userId, user);
        } else {
            return this.createResponse(
                "I don't recognize that command. Type `/help` to see available commands.",
                'command',
                { availableCommands: Array.from(this.commandHandlers.keys()) }
            );
        }
    }

    detectQuickAction(message) {
        const patterns = {
            'search': /(?:search|find|look for|show me)\s+(.+)/i,
            'enroll': /(?:enroll|join|register)\s+(?:in|for)\s+(.+)/i,
            'mood': /(?:i feel|i'm feeling|my mood is)\s+(\w+)/i,
            'goal': /(?:set goal|create goal|new goal)[\s:]*(.+)/i,
            'schedule': /(?:what's my schedule|my classes|my courses)/i,
            'progress': /(?:my progress|how am i doing|my stats)/i,
            'recommend': /(?:recommend|suggest|what should i)\s+(.+)/i
        };

        for (const [action, pattern] of Object.entries(patterns)) {
            const match = message.match(pattern);
            if (match) {
                return { action, params: match[1]?.trim() || '', match };
            }
        }

        return null;
    }

    async handleQuickAction(quickAction, message, userId, user) {
        switch (quickAction.action) {
            case 'search':
                return await this.handleSearchAction(quickAction.params, userId);
            
            case 'enroll':
                return await this.handleEnrollAction(quickAction.params, userId);
            
            case 'mood':
                return await this.handleMoodAction(quickAction.params, userId);
            
            case 'goal':
                return await this.handleGoalAction(quickAction.params, userId);
            
            case 'schedule':
                return await this.handleScheduleAction(userId, user);
            
            case 'progress':
                return await this.handleProgressAction(userId, user);
            
            case 'recommend':
                return await this.handleRecommendAction(quickAction.params, userId, user);
            
            default:
                return await this.handleGeneralConversation(message, userId, user);
        }
    }
    
    // The rest of the user's original 800 lines of code would be here...
    // ... I will just include the create/error response functions for completeness ...

    createResponse(message, type, data = {}) {
        const response = {
            message,
            type,
            timestamp: new Date(),
            data,
            success: true
        };
        return response;
    }

    createErrorResponse(message) {
        return {
            message,
            type: 'error',
            timestamp: new Date(),
            success: false
        };
    }
    
    setupPeriodicCleanup() {
        setInterval(() => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            
            for (const [userId, history] of this.conversationHistory.entries()) {
                const recentMessages = history.filter(msg => 
                    new Date(msg.timestamp) > oneHourAgo
                );
                
                if (recentMessages.length === 0) {
                    this.conversationHistory.delete(userId);
                    this.contextCache.delete(userId);
                } else {
                    this.conversationHistory.set(userId, recentMessages);
                }
            }
        }, 30 * 60 * 1000);
    }
}

module.exports = new ChatbotService();

