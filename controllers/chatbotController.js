// Chatbot Controller
const chatbotService = require('../services/chatbot');
const { catchAsync, ValidationError } = require('../middleware/errorHandler');

/**
 * Send message to chatbot
 */
const sendMessage = catchAsync(async (req, res, next) => {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
        return next(new ValidationError('Message is required'));
    }

    if (message.length > 1000) {
        return next(new ValidationError('Message too long (max 1000 characters)'));
    }

    const response = await chatbotService.processMessage(message, req.userId);

    res.json({
        success: true,
        data: response
    });
});

/**
 * Get conversation history
 */
const getConversationHistory = catchAsync(async (req, res, next) => {
    const { limit = 20 } = req.query;

    // Get history from chatbot service
    const history = chatbotService.conversationHistory.get(req.userId) || [];
    
    // Return last 'limit' messages
    const recentHistory = history.slice(-parseInt(limit));

    res.json({
        success: true,
        data: {
            history: recentHistory,
            count: recentHistory.length,
            hasMore: history.length > parseInt(limit)
        }
    });
});

/**
 * Clear conversation history
 */
const clearConversation = catchAsync(async (req, res, next) => {
    chatbotService.conversationHistory.delete(req.userId);
    chatbotService.contextCache.delete(req.userId);

    res.json({
        success: true,
        message: 'Conversation history cleared'
    });
});

/**
 * Get chatbot suggestions
 */
const getSuggestions = catchAsync(async (req, res, next) => {
    const suggestions = {
        quickActions: [
            { text: "Search for courses", action: "search courses" },
            { text: "Check my progress", action: "my progress" },
            { text: "What's trending in forum?", action: "/forum" },
            { text: "Show my schedule", action: "/schedule" },
            { text: "Wellness tips", action: "/wellness" },
            { text: "Find documents", action: "/documents" }
        ],
        commands: [
            { command: "/help", description: "Show available commands" },
            { command: "/courses", description: "Browse courses" },
            { command: "/forum", description: "Forum discussions" },
            { command: "/profile", description: "Your profile info" },
            { command: "/stats", description: "Your statistics" }
        ],
        examples: [
            "Enroll in programming course",
            "I feel happy today",
            "Set goal: exercise daily",
            "Recommend courses for beginners",
            "Search machine learning"
        ]
    };

    res.json({
        success: true,
        data: suggestions
    });
});

/**
 * Get chatbot status and capabilities
 */
const getChatbotInfo = catchAsync(async (req, res, next) => {
    const info = {
        name: "USSH Assistant",
        version: "1.0.0",
        capabilities: [
            "Course search and enrollment assistance",
            "Forum post discovery",
            "Wellness tracking and tips",
            "Document search in handbook",
            "Personal progress tracking",
            "Schedule management",
            "General Q&A about platform"
        ],
        features: [
            "Context-aware responses",
            "Command-based actions",
            "Quick action detection",
            "Personalized recommendations",
            "Multi-format responses"
        ],
        languages: ["English", "Vietnamese"],
        responseTypes: [
            "text", "courses", "forum", "wellness", 
            "documents", "profile", "stats", "help"
        ]
    };

    res.json({
        success: true,
        data: info
    });
});

/**
 * Provide feedback on chatbot response
 */
const provideFeedback = catchAsync(async (req, res, next) => {
    const { messageId, rating, feedback, responseHelpful } = req.body;

    // Store feedback for analytics (could be saved to database)
    const feedbackData = {
        userId: req.userId,
        messageId,
        rating: parseInt(rating),
        feedback,
        responseHelpful: Boolean(responseHelpful),
        timestamp: new Date()
    };

    // Log feedback for improvement
    console.log('Chatbot feedback received:', feedbackData);

    // In a production environment, you might want to:
    // 1. Save to a feedback collection in database
    // 2. Send to analytics service
    // 3. Use for ML model improvement

    res.json({
        success: true,
        message: 'Thank you for your feedback!'
    });
});

/**
 * Get chatbot analytics (admin only)
 */
const getChatbotAnalytics = catchAsync(async (req, res, next) => {
    const { timeRange = '7d' } = req.query;

    // Calculate analytics
    const analytics = {
        totalConversations: chatbotService.conversationHistory.size,
        activeUsers: chatbotService.conversationHistory.size,
        totalMessages: Array.from(chatbotService.conversationHistory.values())
            .reduce((total, history) => total + history.length, 0),
        averageMessagesPerUser: 0,
        topCommands: [],
        responseTypes: {},
        userSatisfaction: 0 // Would be calculated from feedback
    };

    if (analytics.activeUsers > 0) {
        analytics.averageMessagesPerUser = 
            Math.round(analytics.totalMessages / analytics.activeUsers);
    }

    // Analyze command usage
    const commandCounts = new Map();
    for (const history of chatbotService.conversationHistory.values()) {
        for (const message of history) {
            if (message.role === 'user' && message.content.startsWith('/')) {
                const command = message.content.split(' ')[0];
                commandCounts.set(command, (commandCounts.get(command) || 0) + 1);
            }
        }
    }

    analytics.topCommands = Array.from(commandCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([command, count]) => ({ command, count }));

    res.json({
        success: true,
        data: {
            analytics,
            timeRange,
            generatedAt: new Date()
        }
    });
});

/**
 * Reset chatbot for all users (admin only)
 */
const resetChatbot = catchAsync(async (req, res, next) => {
    chatbotService.conversationHistory.clear();
    chatbotService.contextCache.clear();

    res.json({
        success: true,
        message: 'Chatbot reset successfully for all users'
    });
});

/**
 * Broadcast message from chatbot (admin only)
 */
const broadcastMessage = catchAsync(async (req, res, next) => {
    const { message, targetUsers = 'all' } = req.body;

    if (!message || message.trim().length === 0) {
        return next(new ValidationError('Message is required'));
    }

    const broadcastResponse = {
        message,
        type: 'broadcast',
        timestamp: new Date(),
        success: true,
        data: {
            from: 'USSH Assistant',
            priority: 'high',
            broadcast: true
        }
    };

    // Send via socket service if available
    if (global.socketService) {
        if (targetUsers === 'all') {
            global.socketService.io.emit('chatbot-broadcast', broadcastResponse);
        } else if (Array.isArray(targetUsers)) {
            targetUsers.forEach(userId => {
                global.socketService.sendNotificationToUser(userId, {
                    type: 'chatbot-message',
                    title: 'Message from USSH Assistant',
                    message,
                    data: broadcastResponse
                });
            });
        }
    }

    res.json({
        success: true,
        message: `Broadcast sent to ${targetUsers === 'all' ? 'all users' : targetUsers.length + ' users'}`,
        data: broadcastResponse
    });
});

/**
 * Get popular chatbot queries
 */
const getPopularQueries = catchAsync(async (req, res, next) => {
    const { limit = 10 } = req.query;

    // Analyze conversation history for common patterns
    const queryPatterns = new Map();
    
    for (const history of chatbotService.conversationHistory.values()) {
        for (const message of history) {
            if (message.role === 'user') {
                const content = message.content.toLowerCase().trim();
                
                // Skip very short messages
                if (content.length < 3) continue;
                
                // Group similar queries
                const normalized = content
                    .replace(/[^\w\s]/g, '') // Remove punctuation
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .substring(0, 50); // Limit length
                
                queryPatterns.set(normalized, (queryPatterns.get(normalized) || 0) + 1);
            }
        }
    }

    const popularQueries = Array.from(queryPatterns.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, parseInt(limit))
        .map(([query, count]) => ({ query, count }));

    res.json({
        success: true,
        data: {
            popularQueries,
            totalQueries: queryPatterns.size,
            analyzedConversations: chatbotService.conversationHistory.size
        }
    });
});

module.exports = {
    sendMessage,
    getConversationHistory,
    clearConversation,
    getSuggestions,
    getChatbotInfo,
    provideFeedback,
    getChatbotAnalytics,
    resetChatbot,
    broadcastMessage,
    getPopularQueries
};