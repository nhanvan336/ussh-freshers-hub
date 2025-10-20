const fetch = require('node-fetch'); // [THÊM MỚI] Cần để gọi API từ backend
const User = require('../models/User');
const ForumPost = require('../models/ForumPost');
const Course = require('../models/Course');
const Document = require('../models/Document');

class ChatbotService {
    constructor() {
        this.conversationHistory = new Map(); // userId -> conversation history
        this.contextCache = new Map(); // userId -> user context
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
            const user = await User.findById(userId);
            if (!user) {
                return this.createErrorResponse('User not found');
            }

            const cleanMessage = message.trim();
            
            if (!this.conversationHistory.has(userId)) {
                this.conversationHistory.set(userId, []);
            }
            
            const history = this.conversationHistory.get(userId);
            
            // [CẬP NHẬT] Định dạng tin nhắn người dùng cho Gemini
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

    // [CẬP NHẬT] Handle general conversation with Gemini AI
    async handleGeneralConversation(message, userId, user) {
        const userHistory = this.conversationHistory.get(userId) || [];

        try {
            const apiKey = process.env.GEMINI_API_KEY || "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const systemPrompt = "Bạn là USSH Assistant, một trợ lý AI thân thiện và hữu ích dành cho sinh viên trường Đại học Khoa học Xã hội và Nhân văn, ĐHQG Hà Nội. Nhiệm vụ của bạn là trả lời các câu hỏi liên quan đến đời sống sinh viên, học tập, quy chế, các địa điểm trong trường. Luôn trả lời bằng tiếng Việt một cách ngắn gọn, rõ ràng và lịch sự. Không trả lời các câu hỏi không liên quan.";
            
            const payload = {
                contents: userHistory.map(h => ({ role: h.role, parts: h.parts })), // Chỉ gửi phần cần thiết cho API
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
                // Thêm phản hồi của bot vào lịch sử và cập nhật lại
                userHistory.push({ role: "model", parts: [{ text: botResponseText }], timestamp: new Date() });
                this.conversationHistory.set(userId, userHistory);

                // Trả về dữ liệu theo định dạng của bạn
                return this.createResponse(botResponseText, 'text');
            } else {
                throw new Error('Không nhận được câu trả lời hợp lệ từ AI.');
            }

        } catch (error) {
            console.error('Chatbot Service error:', error);
            return this.createErrorResponse('Rất tiếc, đã có lỗi xảy ra khi kết nối với trợ lý AI.');
        }
    }

    // --- CÁC HÀM KHÁC CỦA BẠN ĐƯỢC GIỮ NGUYÊN ---
    
    // Handle commands
    async handleCommand(message, userId, user) {
        const parts = message.substring(1).split(' ');
        const command = parts[0].toLowerCase();
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

    // Detect quick actions
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

    // Handle quick actions
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
    
    // Command handlers
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
                "What's my schedule?",
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

    async handleCoursesCommand(args, userId, user) {
        try {
            const searchTerm = args.join(' ');
            
            if (searchTerm) {
                const courses = await Course.find({
                    $or: [
                        { title: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { instructor: { $regex: searchTerm, $options: 'i' } }
                    ]
                }).limit(5);

                if (courses.length > 0) {
                    return this.createResponse(
                        `I found ${courses.length} course(s) matching "${searchTerm}":`,
                        'courses',
                        { 
                            courses: courses.map(c => ({
                                id: c._id,
                                title: c.title,
                                instructor: c.instructor,
                                difficulty: c.difficulty,
                                enrollments: c.enrollments
                            })),
                            searchTerm
                        }
                    );
                } else {
                    return this.createResponse(
                        `No courses found matching "${searchTerm}". Try a different search term or browse all courses.`,
                        'courses',
                        { courses: [], searchTerm }
                    );
                }
            } else {
                const featuredCourses = await Course.find({ isFeatured: true }).limit(3);
                const enrolledCourses = user.enrolledCourses?.length || 0;

                return this.createResponse(
                    `You're currently enrolled in ${enrolledCourses} course(s). Here are some featured courses:`,
                    'courses',
                    { 
                        courses: featuredCourses.map(c => ({
                            id: c._id,
                            title: c.title,
                            instructor: c.instructor,
                            difficulty: c.difficulty,
                            enrollments: c.enrollments
                        })),
                        featured: true
                    }
                );
            }
        } catch (error) {
            return this.createErrorResponse('Error fetching courses. Please try again.');
        }
    }

    async handleForumCommand(args, userId, user) {
        try {
            const searchTerm = args.join(' ');
            
            if (searchTerm) {
                const posts = await ForumPost.find({
                    $or: [
                        { title: { $regex: searchTerm, $options: 'i' } },
                        { content: { $regex: searchTerm, $options: 'i' } }
                    ]
                })
                .populate('author', 'username fullName')
                .limit(5)
                .sort({ createdAt: -1 });

                return this.createResponse(
                    `Found ${posts.length} forum post(s) about "${searchTerm}":`,
                    'forum',
                    { 
                        posts: posts.map(p => ({
                            id: p._id,
                            title: p.title,
                            author: p.author.fullName || p.author.username,
                            likes: p.likes.length,
                            commentsCount: p.commentsCount,
                            createdAt: p.createdAt
                        })),
                        searchTerm
                    }
                );
            } else {
                const trendingPosts = await ForumPost.find()
                    .populate('author', 'username fullName')
                    .sort({ likes: -1, commentsCount: -1 })
                    .limit(3);

                return this.createResponse(
                    'Here are the trending forum posts:',
                    'forum',
                    { 
                        posts: trendingPosts.map(p => ({
                            id: p._id,
                            title: p.title,
                            author: p.author.fullName || p.author.username,
                            likes: p.likes.length,
                            commentsCount: p.commentsCount
                        })),
                        trending: true
                    }
                );
            }
        } catch (error) {
            return this.createErrorResponse('Error fetching forum posts. Please try again.');
        }
    }

    async handleWellnessCommand(args, userId, user) {
        try {
            // This function seems to depend on user model fields that might not exist yet.
            // Using placeholder values to avoid errors.
            const wellnessStreak = user.wellnessStreak || 0;

            const tips = [
                "Take a 5-minute break every hour to stretch and relax.",
                "Practice deep breathing: 4 counts in, 7 counts hold, 8 counts out.",
                "Stay hydrated! Drink water regularly throughout the day.",
            ];
            const randomTip = tips[Math.floor(Math.random() * tips.length)];

            return this.createResponse(
                `Your wellness streak: ${wellnessStreak} days! Here's a tip for today:`,
                'wellness',
                {
                    streak: wellnessStreak,
                    tip: randomTip,
                    suggestion: "Try logging your mood today!"
                }
            );
        } catch (error) {
            return this.createErrorResponse('Error fetching wellness data.');
        }
    }

    async handleDocumentsCommand(args, userId, user) {
         try {
            const searchTerm = args.join(' ');
            
            if (searchTerm) {
                const documents = await Document.find({
                    $or: [
                        { title: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } }
                    ]
                })
                .populate('uploader', 'username fullName')
                .limit(5)
                .sort({ views: -1 });

                return this.createResponse(
                    `Found ${documents.length} document(s) related to "${searchTerm}":`,
                    'documents',
                    { 
                        documents: documents.map(d => ({
                            id: d._id,
                            title: d.title,
                            category: d.category,
                            views: d.views,
                            uploadedBy: d.uploader.fullName || d.uploader.username
                        })),
                        searchTerm
                    }
                );
            } else {
                const popularDocs = await Document.find()
                    .populate('uploader', 'username fullName')
                    .sort({ views: -1, downloads: -1 })
                    .limit(3);

                return this.createResponse(
                    'Here are the most popular documents:',
                    'documents',
                    { 
                        documents: popularDocs.map(d => ({
                            id: d._id,
                            title: d.title,
                            category: d.category,
                            views: d.views,
                            downloads: d.downloads
                        })),
                        popular: true
                    }
                );
            }
        } catch (error) {
            return this.createErrorResponse('Error fetching documents. Please try again.');
        }
    }

    async handleProfileCommand(args, userId, user) {
        // Placeholder data to avoid errors if fields don't exist
        const enrolledCount = user.enrolledCourses?.length || 0;
        const postsCount = user.forumStats?.postsCount || 0;
        const wellnessStreak = user.wellness?.streak || 0;

        return this.createResponse(
            `Here's your profile summary, ${user.fullName || user.username}:`,
            'profile',
            {
                username: user.username,
                fullName: user.fullName,
                enrolledCourses: enrolledCount,
                forumPosts: postsCount,
                wellnessStreak: wellnessStreak,
                memberSince: user.createdAt,
            }
        );
    }
    
    // Quick action handlers
    async handleSearchAction(query, userId) {
        // This is a complex function, for now we will just use the command
        return this.handleSearchCommand(query.split(' '), userId);
    }

    async handleEnrollAction(courseName, userId) {
        // Placeholder to avoid errors
        return this.createResponse(`Looking for courses about "${courseName}"...`, 'text');
    }

    async handleMoodAction(mood, userId) {
        // Placeholder to avoid errors
        return this.createResponse(`Thanks for sharing that you feel ${mood}.`, 'text');
    }

    async handleGoalAction(goal, userId) {
        // Placeholder to avoid errors
        return this.createResponse(`Goal set: "${goal}". You can do it!`, 'text');
    }
    
    async handleScheduleAction(userId, user){
         return this.handleScheduleCommand([], userId, user);
    }

    async handleProgressAction(userId, user){
        return this.handleStatsCommand([], userId, user);
    }

    async handleRecommendAction(topic, userId, user){
        return this.createResponse(`Here are some recommendations about ${topic}...`, 'text');
    }

    // Utility functions
    async getUserContext(userId, user) {
        if (this.contextCache.has(userId)) {
            const cached = this.contextCache.get(userId);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return cached.context;
            }
        }

        const context = {
            user: {
                name: user.fullName || user.username,
                role: user.role
            },
            lastLogin: user.lastLogin
        };

        this.contextCache.set(userId, {
            context,
            timestamp: Date.now()
        });

        return context;
    }

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

    async handleSearchCommand(args, userId, user) {
        try {
            const searchQuery = args.join(' ');
            if (!searchQuery) {
                return this.createResponse( "Vui lòng nhập từ khóa tìm kiếm. Ví dụ: `/search nodejs tutorial`", 'info');
            }
            return this.createResponse( `🔍 Đang tìm kiếm "${searchQuery}"...\n\nChức năng tìm kiếm sẽ được cập nhật sớm!`, 'search');
        } catch (error) {
            return this.createErrorResponse('Error during search.');
        }
    }

    async handleClearCommand(args, userId, user) {
        this.conversationHistory.delete(userId);
        this.contextCache.delete(userId);
        
        return this.createResponse( "Conversation history cleared! We can start fresh. How can I help you?", 'clear');
    }

    async handleScheduleCommand(args, userId, user) {
        // Placeholder implementation
        return this.createResponse( "Here is your schedule for this week...", 'schedule');
    }

    async handleStatsCommand(args, userId, user) {
        // Placeholder implementation
        return this.createResponse( "Here are your current stats...", 'stats');
    }
    
    calculateAchievements(stats) {
        const achievements = [];
        if (stats.coursesEnrolled >= 5) achievements.push('📚 Course Explorer');
        if (stats.forumPosts >= 10) achievements.push('💬 Active Discusser');
        return achievements;
    }

    setupPeriodicCleanup() {
        setInterval(() => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            for (const [userId, history] of this.conversationHistory.entries()) {
                if (history.length > 0 && new Date(history[history.length - 1].timestamp) < oneHourAgo) {
                    this.conversationHistory.delete(userId);
                    this.contextCache.delete(userId);
                }
            }
        }, 30 * 60 * 1000);
    }
}

module.exports = new ChatbotService();

