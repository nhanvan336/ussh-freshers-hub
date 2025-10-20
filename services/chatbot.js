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

    // Setup command handlers
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

    // Main message processing function
    async processMessage(message, userId) {
        try {
            let user = null;
            if (userId) {
                user = await User.findById(userId);
            }
            const conversationId = userId || `guest_${Date.now()}`;

            const cleanMessage = message.trim();
            
            if (!this.conversationHistory.has(conversationId)) {
                this.conversationHistory.set(conversationId, []);
            }
            
            const history = this.conversationHistory.get(conversationId);
            
            history.push({
                role: 'user',
                parts: [{ text: cleanMessage }],
                timestamp: new Date()
            });

            if (history.length > 10) {
                this.conversationHistory.set(conversationId, history.slice(-10));
            }

            if (!user) {
                return await this.handleGeneralConversation(cleanMessage, conversationId, null);
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
    async handleGeneralConversation(message, conversationId, user) {
        const userHistory = this.conversationHistory.get(conversationId) || [];

        try {
            const apiKey = process.env.GEMINI_API_KEY || "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const systemPrompt = "Bạn là USSH Assistant, một trợ lý AI thân thiện và hữu ích dành cho sinh viên trường Đại học Khoa học Xã hội và Nhân văn, ĐHQG Hà Nội. Nhiệm vụ của bạn là trả lời các câu hỏi liên quan đến đời sống sinh viên, học tập, quy chế, các địa điểm trong trường. Luôn trả lời bằng tiếng Việt một cách ngắn gọn, rõ ràng và lịch sự. Không trả lời các câu hỏi không liên quan.";
            
            const payload = {
                contents: userHistory.map(h => ({ role: h.role, parts: h.parts })),
                systemInstruction: { parts: [{ text: systemPrompt }] },
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
                this.conversationHistory.set(conversationId, userHistory);
                return this.createResponse(botResponseText, 'text');
            } else {
                throw new Error('Không nhận được câu trả lời hợp lệ từ AI.');
            }

        } catch (error) {
            console.error('Chatbot Service error:', error);
            return this.createErrorResponse('Rất tiếc, đã có lỗi xảy ra khi kết nối với trợ lý AI.');
        }
    }
    
    // --- CÁC HÀM CÒN LẠI CỦA BẠN ĐƯỢC GIỮ NGUYÊN ---
    
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

    async handleHelpCommand(args, userId, user) {
        const helpContent = {
            commands: [
                { command: '/help', description: 'Show this help message' },
                { command: '/courses [search]', description: 'Find or list courses' },
                { command: '/forum [topic]', description: 'Search forum posts or get trending' },
                { command: '/wellness', description: 'Get wellness tips and track mood' },
                { command: '/documents [search]', description: 'Find documents in handbook' },
                { command: '/profile', description: 'View your profile summary' },
                { command: '/schedule', description: 'View your course schedule' },
                { command: '/stats', description: 'View your learning statistics' },
                { command: '/clear', description: 'Clear conversation history' }
            ],
            quickActions: [
                'Search for [topic]',
                'Enroll in [course name]',
                'I feel [mood]',
                'Set goal: [goal description]',
                'What\'s my schedule?',
                'My progress',
                'Recommend [courses/activities]'
            ]
        };

        return this.createResponse(
            `Hi ${user.fullName || user.username}! I'm here to help you navigate USSH Freshers' Hub. Here's what I can do:`,
            'help',
            helpContent
        );
    }

    // ... and so on for all the other handle... functions from the original file
}

module.exports = new ChatbotService();

