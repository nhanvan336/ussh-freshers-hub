// AI Chatbot Service

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



            // Clean and prepare message

            const cleanMessage = message.trim().toLowerCase();

            

            // Get or create conversation history

            if (!this.conversationHistory.has(userId)) {

                this.conversationHistory.set(userId, []);

            }

            

            const history = this.conversationHistory.get(userId);

            

            // Add user message to history

            history.push({

                role: 'user',

                content: message,

                timestamp: new Date()

            });



            // Keep only last 10 messages

            if (history.length > 10) {

                this.conversationHistory.set(userId, history.slice(-10));

            }



            // Check for commands

            if (cleanMessage.startsWith('/')) {

                return await this.handleCommand(cleanMessage, userId, user);

            }



            // Check for quick actions

            const quickAction = this.detectQuickAction(cleanMessage);

            if (quickAction) {

                return await this.handleQuickAction(quickAction, cleanMessage, userId, user);

            }



            // Process as general conversation

            return await this.handleGeneralConversation(cleanMessage, userId, user);



        } catch (error) {

            console.error('Chatbot processing error:', error);

            return this.createErrorResponse('Sorry, I encountered an error. Please try again.');

        }

    }



    // Handle commands

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



    // Handle general conversation

    async handleGeneralConversation(message, userId, user) {

        // Get user context for personalized responses

        const context = await this.getUserContext(userId, user);

        

        // Generate contextual response

        const response = await this.generateContextualResponse(message, context, user);

        

        return response;

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



    async handleCoursesCommand(args, userId, user) {

        try {

            const searchTerm = args.join(' ');

            

            if (searchTerm) {

                // Search courses

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

                // Get featured courses

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

                // Search forum posts

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

                            likes: p.likes,

                            commentsCount: p.commentsCount,

                            createdAt: p.createdAt

                        })),

                        searchTerm

                    }

                );

            } else {

                // Get trending posts

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

                            likes: p.likes,

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

            // Get user's recent wellness data

            const recentEntries = user.wellnessEntries?.slice(-5) || [];

            const wellnessStreak = user.wellnessStreak || 0;



            const tips = [

                "Take a 5-minute break every hour to stretch and relax.",

                "Practice deep breathing: 4 counts in, 7 counts hold, 8 counts out.",

                "Stay hydrated! Drink water regularly throughout the day.",

                "Get some sunlight or fresh air to boost your mood.",

                "Connect with friends - social interaction is great for mental health."

            ];



            const randomTip = tips[Math.floor(Math.random() * tips.length)];



            return this.createResponse(

                `Your wellness streak: ${wellnessStreak} days! Here's a tip for today:`,

                'wellness',

                {

                    streak: wellnessStreak,

                    tip: randomTip,

                    recentEntries: recentEntries.length,

                    suggestion: wellnessStreak === 0 ? 

                        "Try logging your mood today to start your wellness journey!" :

                        "Keep up the great work with your wellness tracking!"

                }

            );

        } catch (error) {

            return this.createErrorResponse('Error fetching wellness data. Please try again.');

        }

    }



    async handleDocumentsCommand(args, userId, user) {

        try {

            const searchTerm = args.join(' ');

            

            if (searchTerm) {

                // Search documents

                const documents = await Document.find({

                    $or: [

                        { title: { $regex: searchTerm, $options: 'i' } },

                        { description: { $regex: searchTerm, $options: 'i' } },

                        { content: { $regex: searchTerm, $options: 'i' } }

                    ]

                })

                .populate('uploadedBy', 'username fullName')

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

                            uploadedBy: d.uploadedBy.fullName || d.uploadedBy.username

                        })),

                        searchTerm

                    }

                );

            } else {

                // Get popular documents

                const popularDocs = await Document.find()

                    .populate('uploadedBy', 'username fullName')

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

        const enrolledCount = user.enrolledCourses?.length || 0;

        const postsCount = user.postsCount || 0;

        const wellnessStreak = user.wellnessStreak || 0;

        const joinDate = user.registrationDate;



        return this.createResponse(

            `Here's your profile summary, ${user.fullName || user.username}:`,

            'profile',

            {

                username: user.username,

                fullName: user.fullName,

                faculty: user.faculty,

                year: user.year,

                enrolledCourses: enrolledCount,

                forumPosts: postsCount,

                wellnessStreak: wellnessStreak,

                memberSince: joinDate,

                role: user.role

            }

        );

    }



    // Quick action handlers

    async handleSearchAction(query, userId) {

        try {

            // Search across all content types

            const [courses, posts, documents] = await Promise.all([

                Course.find({

                    $or: [

                        { title: { $regex: query, $options: 'i' } },

                        { description: { $regex: query, $options: 'i' } }

                    ]

                }).limit(3),

                

                ForumPost.find({

                    $or: [

                        { title: { $regex: query, $options: 'i' } },

                        { content: { $regex: query, $options: 'i' } }

                    ]

                }).populate('author', 'username fullName').limit(3),

                

                Document.find({

                    $or: [

                        { title: { $regex: query, $options: 'i' } },

                        { description: { $regex: query, $options: 'i' } }

                    ]

                }).limit(3)

            ]);



            const totalResults = courses.length + posts.length + documents.length;



            if (totalResults === 0) {

                return this.createResponse(

                    `No results found for "${query}". Try different keywords or check spelling.`,

                    'search',

                    { query, results: { courses: [], posts: [], documents: [] } }

                );

            }



            return this.createResponse(

                `Found ${totalResults} result(s) for "${query}":`,

                'search',

                {

                    query,

                    results: {

                        courses: courses.map(c => ({ id: c._id, title: c.title, type: 'course' })),

                        posts: posts.map(p => ({ id: p._id, title: p.title, type: 'post' })),

                        documents: documents.map(d => ({ id: d._id, title: d.title, type: 'document' }))

                    }

                }

            );

        } catch (error) {

            return this.createErrorResponse('Search error. Please try again.');

        }

    }



    async handleEnrollAction(courseName, userId) {

        try {

            const course = await Course.findOne({

                title: { $regex: courseName, $options: 'i' }

            });



            if (!course) {

                return this.createResponse(

                    `I couldn't find a course named "${courseName}". Try searching with different keywords.`,

                    'enroll',

                    { courseName, found: false }

                );

            }



            const user = await User.findById(userId);

            const isEnrolled = user.enrolledCourses.some(

                enrolled => enrolled.course.toString() === course._id.toString()

            );



            if (isEnrolled) {

                return this.createResponse(

                    `You're already enrolled in "${course.title}". Check your learning dashboard for progress.`,

                    'enroll',

                    { course: course.title, alreadyEnrolled: true }

                );

            }



            return this.createResponse(

                `I found "${course.title}" by ${course.instructor}. Would you like me to help you enroll?`,

                'enroll',

                {

                    course: {

                        id: course._id,

                        title: course.title,

                        instructor: course.instructor,

                        difficulty: course.difficulty,

                        duration: course.duration

                    },

                    found: true,

                    canEnroll: true

                }

            );

        } catch (error) {

            return this.createErrorResponse('Error finding course. Please try again.');

        }

    }



    async handleMoodAction(mood, userId) {

        const moodEmojis = {

            'happy': '😊', 'good': '😊', 'great': '😄', 'amazing': '🤩',

            'sad': '😢', 'down': '😞', 'depressed': '😔',

            'angry': '😠', 'frustrated': '😤', 'annoyed': '😒',

            'excited': '🤗', 'energetic': '⚡', 'motivated': '💪',

            'tired': '😴', 'exhausted': '🥱', 'sleepy': '😪',

            'anxious': '😰', 'worried': '😟', 'stressed': '😓',

            'neutral': '😐', 'okay': '🙂', 'fine': '🙂'

        };



        const emoji = moodEmojis[mood.toLowerCase()] || '😊';

        

        const responses = {

            'happy': "That's wonderful! Keep that positive energy going!",

            'sad': "I'm sorry you're feeling down. Remember, it's okay to have difficult days.",

            'stressed': "Stress can be tough. Try some deep breathing or take a short break.",

            'excited': "I love your enthusiasm! Channel that energy into something productive!",

            'tired': "Rest is important. Make sure you're getting enough sleep.",

            'anxious': "Anxiety is challenging. Consider talking to someone or trying relaxation techniques."

        };



        const response = responses[mood.toLowerCase()] || 

                        `Thanks for sharing how you're feeling. ${emoji}`;



        return this.createResponse(

            `${emoji} ${response}`,

            'mood',

            {

                mood: mood,

                emoji: emoji,

                suggestion: "Consider logging this in your wellness tracker to monitor your mental health patterns."

            }

        );

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

                faculty: user.faculty,

                year: user.year,

                role: user.role

            },

            enrolledCourses: user.enrolledCourses?.length || 0,

            wellnessStreak: user.wellnessStreak || 0,

            forumActivity: user.postsCount || 0,

            lastLogin: user.lastLoginDate

        };



        this.contextCache.set(userId, {

            context,

            timestamp: Date.now()

        });



        return context;

    }



    generateContextualResponse(message, context, user) {

        // Simple pattern matching for common queries

        const patterns = {

            greeting: /^(hi|hello|hey|good morning|good afternoon|good evening)/i,

            thanks: /^(thank|thanks|thank you)/i,

            goodbye: /^(bye|goodbye|see you|later)/i,

            help: /^(help|what can you do|how do you work)/i

        };



        if (patterns.greeting.test(message)) {

            const greetings = [

                `Hello ${context.user.name}! How can I help you today?`,

                `Hi there! Ready to explore what USSH Freshers' Hub has to offer?`,

                `Hey ${context.user.name}! What would you like to know about?`

            ];

            return this.createResponse(

                greetings[Math.floor(Math.random() * greetings.length)],

                'greeting',

                { context }

            );

        }



        if (patterns.thanks.test(message)) {

            return this.createResponse(

                "You're welcome! I'm here whenever you need help. 😊",

                'thanks'

            );

        }



        if (patterns.goodbye.test(message)) {

            return this.createResponse(

                "Goodbye! Feel free to ask me anything anytime. Have a great day! 👋",

                'goodbye'

            );

        }



        // Default response with context

        const responses = [

            `I'm here to help you with courses, forum posts, wellness tracking, and more. What specific topic interests you?`,

            `You can ask me about your enrolled courses, search for documents, check forum discussions, or get wellness tips. What would you like to explore?`,

            `I can help you navigate USSH Freshers' Hub! Try asking about courses, forum posts, your progress, or wellness activities.`

        ];



        return this.createResponse(

            responses[Math.floor(Math.random() * responses.length)],

            'general',

            { 

                context,

                suggestions: [

                    'Search for courses',

                    'Check forum posts',

                    'View my progress',

                    'Wellness tips',

                    'Help me find documents'

                ]

            }

        );

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



    // Handle search command

    async handleSearchCommand(args, userId, user) {

        try {

            const searchQuery = args.join(' ');

            

            if (!searchQuery) {

                return this.createResponse(

                    "Vui lòng nhập từ khóa tìm kiếm. Ví dụ: `/search nodejs tutorial`",

                    'info'

                );

            }



            return this.createResponse(

                `🔍 Đang tìm kiếm "${searchQuery}"...\n\nChức năng tìm kiếm sẽ được cập nhật sớm! Hiện tại bạn có thể:\n- Sử dụng tính năng tìm kiếm trên forum\n- Tìm kiếm tài liệu trong Learning Hub\n- Hỏi trực tiếp tôi về thông tin bạn cần`,

                'search',

                {

                    suggestions: [

                        "Hỏi về thông tin môn học",

                        "Tìm hiểu về hoạt động sinh viên", 

                        "Hướng dẫn sử dụng website"

                    ]

                }

            );

        } catch (error) {

            console.error('Search command error:', error);

            return this.createResponse(

                "Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau.",

                'error'

            );

        }

    }



    // Additional command handlers

    async handleClearCommand(args, userId, user) {

        this.conversationHistory.delete(userId);

        this.contextCache.delete(userId);

        

        return this.createResponse(

            "Conversation history cleared! We can start fresh. How can I help you?",

            'clear'

        );

    }



    async handleScheduleCommand(args, userId, user) {

        const enrolledCourses = user.enrolledCourses || [];

        

        if (enrolledCourses.length === 0) {

            return this.createResponse(

                "You haven't enrolled in any courses yet. Browse available courses to get started!",

                'schedule',

                { courses: [], empty: true }

            );

        }



        // Get course details

        const courseIds = enrolledCourses.map(e => e.course);

        const courses = await Course.find({ _id: { $in: courseIds } });



        return this.createResponse(

            `You're enrolled in ${courses.length} course(s):`,

            'schedule',

            {

                courses: courses.map(c => ({

                    id: c._id,

                    title: c.title,

                    instructor: c.instructor,

                    progress: enrolledCourses.find(e => 

                        e.course.toString() === c._id.toString()

                    )?.progress || 0

                }))

            }

        );

    }



    async handleStatsCommand(args, userId, user) {

        const stats = {

            coursesEnrolled: user.enrolledCourses?.length || 0,

            forumPosts: user.postsCount || 0,

            commentsCount: user.commentsCount || 0,

            wellnessStreak: user.wellnessStreak || 0,

            documentsBookmarked: user.bookmarkedDocuments?.length || 0,

            memberSince: user.registrationDate

        };



        const memberDays = Math.floor(

            (new Date() - new Date(user.registrationDate)) / (1000 * 60 * 60 * 24)

        );



        return this.createResponse(

            `Here are your USSH Freshers' Hub statistics:`,

            'stats',

            {

                ...stats,

                memberDays,

                achievements: this.calculateAchievements(stats)

            }

        );

    }



    calculateAchievements(stats) {

        const achievements = [];

        

        if (stats.coursesEnrolled >= 5) achievements.push('📚 Course Explorer');

        if (stats.forumPosts >= 10) achievements.push('💬 Active Discusser');

        if (stats.wellnessStreak >= 7) achievements.push('💚 Wellness Warrior');

        if (stats.documentsBookmarked >= 20) achievements.push('📖 Knowledge Collector');

        

        return achievements;

    }



    // Cleanup old conversations

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

        }, 30 * 60 * 1000); // Run every 30 minutes

    }

}



module.exports = new ChatbotService();
