// Wellness Controller
const WellnessEntry = require('../models/WellnessEntry');
const User = require('../models/User');
const { 
    catchAsync, 
    AppError, 
    NotFoundError,
    ValidationError 
} = require('../middleware/errorHandler');

/**
 * Get user's wellness entries with pagination and filters
 */
const getWellnessEntries = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 20,
        type,
        startDate,
        endDate,
        sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = { user: req.userId };

    if (type) {
        filter.type = type;
    }

    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            filter.createdAt.$lte = new Date(endDate);
        }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get entries
    const entries = await WellnessEntry.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Get total count for pagination
    const total = await WellnessEntry.countDocuments(filter);

    res.json({
        success: true,
        data: {
            entries,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalEntries: total,
                hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            }
        }
    });
});

/**
 * Create new wellness entry
 */
const createWellnessEntry = catchAsync(async (req, res, next) => {
    const { type, data, notes } = req.body;

    // Validate entry type
    const validTypes = ['mood', 'activity', 'goal', 'reflection'];
    if (!validTypes.includes(type)) {
        return next(new ValidationError(`Invalid entry type. Must be one of: ${validTypes.join(', ')}`));
    }

    // Validate data based on type
    const validationError = validateWellnessData(type, data);
    if (validationError) {
        return next(new ValidationError(validationError));
    }

    const entry = new WellnessEntry({
        user: req.userId,
        type,
        data,
        notes,
        createdAt: new Date()
    });

    await entry.save();

    // Update user's wellness streak if it's a mood entry
    if (type === 'mood') {
        await updateWellnessStreak(req.userId);
        
        // Check for streak milestone
        const user = await User.findById(req.userId);
        if (user.wellnessStreak && user.wellnessStreak % 7 === 0) { // Every 7 days
            if (global.notificationService) {
                await global.notificationService.createWellnessNotification(
                    req.userId,
                    'streak-milestone',
                    {
                        streakDays: user.wellnessStreak,
                        mood: data.mood
                    }
                );
            }
        }
    }

    // Real-time wellness check-in broadcast
    if (global.socketService) {
        // Broadcast to wellness community room (anonymous)
        global.socketService.broadcastToRoom('wellness-community', 'wellness-checkin', {
            type,
            mood: type === 'mood' ? data.mood : null,
            activityType: type === 'activity' ? data.activity : null,
            anonymous: true,
            timestamp: new Date()
        });

        // Send personal notification
        global.socketService.sendNotificationToUser(req.userId, {
            type: 'wellness-update',
            title: 'Wellness Entry Added',
            message: `Your ${type} entry has been recorded`,
            data: { entryId: entry._id, type }
        });
    }

    res.status(201).json({
        success: true,
        message: 'Wellness entry created successfully',
        data: {
            entry
        }
    });
});

/**
 * Update wellness entry
 */
const updateWellnessEntry = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { type, data, notes } = req.body;

    const entry = await WellnessEntry.findOne({ _id: id, user: req.userId });

    if (!entry) {
        return next(new NotFoundError('Wellness entry not found'));
    }

    // Validate data if provided
    if (data) {
        const validationError = validateWellnessData(type || entry.type, data);
        if (validationError) {
            return next(new ValidationError(validationError));
        }
    }

    // Update fields
    if (type) entry.type = type;
    if (data) entry.data = data;
    if (notes !== undefined) entry.notes = notes;
    entry.updatedAt = new Date();

    await entry.save();

    res.json({
        success: true,
        message: 'Wellness entry updated successfully',
        data: {
            entry
        }
    });
});

/**
 * Delete wellness entry
 */
const deleteWellnessEntry = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const entry = await WellnessEntry.findOneAndDelete({ _id: id, user: req.userId });

    if (!entry) {
        return next(new NotFoundError('Wellness entry not found'));
    }

    // Update wellness streak if it was a mood entry
    if (entry.type === 'mood') {
        await updateWellnessStreak(req.userId);
    }

    res.json({
        success: true,
        message: 'Wellness entry deleted successfully'
    });
});

/**
 * Get wellness statistics and insights
 */
const getWellnessStats = catchAsync(async (req, res, next) => {
    const { period = '30d' } = req.query;

    // Calculate date range
    let startDate;
    switch (period) {
        case '7d':
            startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
            startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user's wellness entries
    const entries = await WellnessEntry.find({
        user: req.userId,
        createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Calculate statistics
    const stats = calculateWellnessStats(entries, period);

    // Get current user info for streak
    const user = await User.findById(req.userId);

    res.json({
        success: true,
        data: {
            ...stats,
            currentStreak: user.wellnessStreak || 0,
            period
        }
    });
});

/**
 * Get mood trends
 */
const getMoodTrends = catchAsync(async (req, res, next) => {
    const { days = 30 } = req.query;

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const moodEntries = await WellnessEntry.find({
        user: req.userId,
        type: 'mood',
        createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Group by date and calculate average mood
    const moodTrends = {};
    moodEntries.forEach(entry => {
        const date = entry.createdAt.toISOString().split('T')[0];
        if (!moodTrends[date]) {
            moodTrends[date] = { total: 0, count: 0, moods: [] };
        }
        
        const moodValue = getMoodValue(entry.data.mood);
        moodTrends[date].total += moodValue;
        moodTrends[date].count += 1;
        moodTrends[date].moods.push(entry.data.mood);
    });

    // Calculate averages and format response
    const trends = Object.keys(moodTrends).map(date => ({
        date,
        averageMood: moodTrends[date].total / moodTrends[date].count,
        moodCount: moodTrends[date].count,
        dominantMood: getDominantMood(moodTrends[date].moods)
    }));

    res.json({
        success: true,
        data: {
            trends,
            summary: {
                totalDays: trends.length,
                averageOverall: trends.length > 0 
                    ? trends.reduce((sum, day) => sum + day.averageMood, 0) / trends.length
                    : 0
            }
        }
    });
});

/**
 * Get wellness goals and progress
 */
const getWellnessGoals = catchAsync(async (req, res, next) => {
    const goals = await WellnessEntry.find({
        user: req.userId,
        type: 'goal'
    }).sort({ createdAt: -1 });

    // Separate active and completed goals
    const activeGoals = goals.filter(goal => !goal.data.isCompleted);
    const completedGoals = goals.filter(goal => goal.data.isCompleted);

    res.json({
        success: true,
        data: {
            activeGoals,
            completedGoals,
            totalGoals: goals.length,
            completionRate: goals.length > 0 
                ? Math.round((completedGoals.length / goals.length) * 100)
                : 0
        }
    });
});

/**
 * Complete a wellness goal
 */
const completeGoal = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const goal = await WellnessEntry.findOne({
        _id: id,
        user: req.userId,
        type: 'goal'
    });

    if (!goal) {
        return next(new NotFoundError('Goal not found'));
    }

    goal.data.isCompleted = true;
    goal.data.completedAt = new Date();
    goal.updatedAt = new Date();

    await goal.save();

    // Send goal completion notification
    if (global.notificationService) {
        await global.notificationService.createWellnessNotification(
            req.userId,
            'goal-completed',
            {
                goalId: goal._id,
                goalTitle: goal.data.title,
                completedAt: goal.data.completedAt
            }
        );
    }

    // Real-time celebration
    if (global.socketService) {
        global.socketService.sendNotificationToUser(req.userId, {
            type: 'goal-celebration',
            title: '🎉 Goal Completed!',
            message: `Congratulations on completing your goal: ${goal.data.title}`,
            data: { goalId: goal._id }
        });

        // Broadcast achievement to wellness community
        global.socketService.broadcastToRoom('wellness-community', 'goal-achievement', {
            anonymous: true,
            goalType: goal.data.category || 'general',
            timestamp: new Date()
        });
    }

    res.json({
        success: true,
        message: 'Goal marked as completed!',
        data: {
            goal
        }
    });
});

/**
 * Get wellness recommendations
 */
const getRecommendations = catchAsync(async (req, res, next) => {
    // Get recent entries to analyze patterns
    const recentEntries = await WellnessEntry.find({
        user: req.userId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    const recommendations = generateRecommendations(recentEntries);

    res.json({
        success: true,
        data: {
            recommendations
        }
    });
});

/**
 * Get wellness reminders
 */
const getReminders = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userId);
    
    res.json({
        success: true,
        data: {
            reminders: user.wellnessReminders || []
        }
    });
});

/**
 * Set wellness reminder
 */
const setReminder = catchAsync(async (req, res, next) => {
    const { title, time, frequency, isActive = true } = req.body;

    if (!title || !time || !frequency) {
        return next(new ValidationError('Title, time, and frequency are required'));
    }

    const user = await User.findById(req.userId);
    
    if (!user.wellnessReminders) {
        user.wellnessReminders = [];
    }

    const reminder = {
        id: new Date().getTime().toString(),
        title,
        time,
        frequency,
        isActive,
        createdAt: new Date()
    };

    user.wellnessReminders.push(reminder);
    await user.save();

    res.status(201).json({
        success: true,
        message: 'Reminder set successfully',
        data: {
            reminder
        }
    });
});

/**
 * Helper function to validate wellness data
 */
function validateWellnessData(type, data) {
    switch (type) {
        case 'mood':
            if (!data.mood || !['very-happy', 'happy', 'neutral', 'sad', 'very-sad'].includes(data.mood)) {
                return 'Invalid mood value';
            }
            break;
        case 'activity':
            if (!data.activity || typeof data.activity !== 'string') {
                return 'Activity name is required';
            }
            break;
        case 'goal':
            if (!data.title || typeof data.title !== 'string') {
                return 'Goal title is required';
            }
            break;
        case 'reflection':
            if (!data.content || typeof data.content !== 'string') {
                return 'Reflection content is required';
            }
            break;
    }
    return null;
}

/**
 * Helper function to update wellness streak
 */
async function updateWellnessStreak(userId) {
    const user = await User.findById(userId);
    
    // Get mood entries from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const moodEntries = await WellnessEntry.find({
        user: userId,
        type: 'mood',
        createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 });

    // Calculate streak (consecutive days with mood entries)
    let streak = 0;
    const today = new Date().toDateString();
    const entryDates = [...new Set(moodEntries.map(entry => 
        entry.createdAt.toDateString()
    ))];

    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toDateString();
        if (entryDates.includes(checkDate)) {
            streak++;
        } else {
            break;
        }
    }

    user.wellnessStreak = streak;
    await user.save();
}

/**
 * Helper function to calculate wellness statistics
 */
function calculateWellnessStats(entries, period) {
    const stats = {
        totalEntries: entries.length,
        entriesByType: {},
        moodDistribution: {},
        activitiesCount: 0,
        goalsCount: 0,
        reflectionsCount: 0
    };

    entries.forEach(entry => {
        // Count by type
        stats.entriesByType[entry.type] = (stats.entriesByType[entry.type] || 0) + 1;

        switch (entry.type) {
            case 'mood':
                const mood = entry.data.mood;
                stats.moodDistribution[mood] = (stats.moodDistribution[mood] || 0) + 1;
                break;
            case 'activity':
                stats.activitiesCount++;
                break;
            case 'goal':
                stats.goalsCount++;
                break;
            case 'reflection':
                stats.reflectionsCount++;
                break;
        }
    });

    return stats;
}

/**
 * Helper function to get mood value for calculations
 */
function getMoodValue(mood) {
    const moodValues = {
        'very-sad': 1,
        'sad': 2,
        'neutral': 3,
        'happy': 4,
        'very-happy': 5
    };
    return moodValues[mood] || 3;
}

/**
 * Helper function to get dominant mood
 */
function getDominantMood(moods) {
    const moodCounts = {};
    moods.forEach(mood => {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    
    return Object.keys(moodCounts).reduce((a, b) => 
        moodCounts[a] > moodCounts[b] ? a : b
    );
}

/**
 * Helper function to generate wellness recommendations
 */
function generateRecommendations(entries) {
    const recommendations = [];

    // Analyze mood patterns
    const moodEntries = entries.filter(e => e.type === 'mood');
    const recentMoods = moodEntries.slice(0, 3).map(e => e.data.mood);

    if (recentMoods.includes('sad') || recentMoods.includes('very-sad')) {
        recommendations.push({
            type: 'mood',
            title: 'Consider Stress Relief Activities',
            description: 'Try breathing exercises, meditation, or talking to a friend.',
            priority: 'high'
        });
    }

    // Check activity frequency
    const activityEntries = entries.filter(e => e.type === 'activity');
    if (activityEntries.length < 3) {
        recommendations.push({
            type: 'activity',
            title: 'Stay Active',
            description: 'Try to engage in wellness activities more regularly.',
            priority: 'medium'
        });
    }

    // Check goal progress
    const goalEntries = entries.filter(e => e.type === 'goal');
    const completedGoals = goalEntries.filter(e => e.data.isCompleted);
    
    if (goalEntries.length > 0 && completedGoals.length === 0) {
        recommendations.push({
            type: 'goal',
            title: 'Focus on Your Goals',
            description: 'Review your wellness goals and take small steps towards completing them.',
            priority: 'medium'
        });
    }

    return recommendations;
}

module.exports = {
    getWellnessEntries,
    createWellnessEntry,
    updateWellnessEntry,
    deleteWellnessEntry,
    getWellnessStats,
    getMoodTrends,
    getWellnessGoals,
    completeGoal,
    getRecommendations,
    getReminders,
    setReminder
};