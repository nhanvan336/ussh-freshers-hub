// Authentication Controller
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateTokens, verifyToken, JWT_REFRESH_SECRET } = require('../middleware/auth');
const { 
    catchAsync, 
    AppError, 
    AuthenticationError, 
    ConflictError,
    ValidationError 
} = require('../middleware/errorHandler');

/**
 * Register new user
 */
const register = catchAsync(async (req, res, next) => {
    const { username, email, password, fullName, studentId, faculty, year } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
        ]
    });

    if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
            return next(new ConflictError('Email already registered'));
        }
        if (existingUser.username === username.toLowerCase()) {
            return next(new ConflictError('Username already taken'));
        }
    }

    // Check if student ID is already used (if provided)
    if (studentId) {
        const existingStudentId = await User.findOne({ studentId });
        if (existingStudentId) {
            return next(new ConflictError('Student ID already registered'));
        }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        studentId,
        faculty,
        year,
        registrationDate: new Date(),
        lastLoginDate: new Date()
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user (encrypted)
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
            user: userResponse,
            tokens: {
                accessToken,
                refreshToken
            }
        }
    });
});

/**
 * Login user
 */
const login = catchAsync(async (req, res, next) => {
    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() }
        ]
    }).select('+password');

    if (!user) {
        return next(new AuthenticationError('Invalid credentials'));
    }

    // Check if account is active
    if (!user.isActive) {
        return next(new AuthenticationError('Account is deactivated. Please contact support.'));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return next(new AuthenticationError('Invalid credentials'));
    }

    // Update last login
    user.lastLoginDate = new Date();
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user (encrypted)
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: userResponse,
            tokens: {
                accessToken,
                refreshToken
            }
        }
    });
});

/**
 * Refresh access token
 */
const refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken: providedRefreshToken } = req.body;

    if (!providedRefreshToken) {
        return next(new AuthenticationError('Refresh token required'));
    }

    // Verify refresh token
    const decoded = verifyToken(providedRefreshToken, JWT_REFRESH_SECRET);
    if (!decoded) {
        return next(new AuthenticationError('Invalid refresh token'));
    }

    // Find user and verify stored refresh token
    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshToken) {
        return next(new AuthenticationError('Invalid refresh token'));
    }

    const isRefreshTokenValid = await bcrypt.compare(providedRefreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
        return next(new AuthenticationError('Invalid refresh token'));
    }

    // Check if user is still active
    if (!user.isActive) {
        return next(new AuthenticationError('Account is deactivated'));
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Update stored refresh token
    user.refreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await user.save();

    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            tokens
        }
    });
});

/**
 * Logout user
 */
const logout = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userId);
    
    if (user) {
        // Clear refresh token
        user.refreshToken = null;
        await user.save();
    }

    res.json({
        success: true,
        message: 'Logout successful'
    });
});

/**
 * Logout from all devices
 */
const logoutAll = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userId);
    
    if (user) {
        // Clear refresh token (this invalidates all sessions)
        user.refreshToken = null;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing tokens
        await user.save();
    }

    res.json({
        success: true,
        message: 'Logged out from all devices'
    });
});

/**
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userId)
        .populate('enrolledCourses', 'title instructor progress')
        .populate('savedPosts', 'title author createdAt');

    if (!user) {
        return next(new AuthenticationError('User not found'));
    }

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.json({
        success: true,
        data: {
            user: userResponse
        }
    });
});

/**
 * Update user profile
 */
const updateProfile = catchAsync(async (req, res, next) => {
    const allowedUpdates = [
        'fullName', 'bio', 'faculty', 'year', 'interests', 
        'socialLinks', 'profilePicture', 'preferences'
    ];
    
    const updates = {};
    
    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
            updates[key] = req.body[key];
        }
    });

    if (Object.keys(updates).length === 0) {
        return next(new ValidationError('No valid fields to update'));
    }

    const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!user) {
        return next(new AuthenticationError('User not found'));
    }

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: userResponse
        }
    });
});

/**
 * Change password
 */
const changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
        return next(new AuthenticationError('User not found'));
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        return next(new AuthenticationError('Current password is incorrect'));
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and invalidate all sessions
    user.password = hashedNewPassword;
    user.refreshToken = null; // Force re-login
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.'
    });
});

/**
 * Deactivate account
 */
const deactivateAccount = catchAsync(async (req, res, next) => {
    const { password } = req.body;

    // Get user with password
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
        return next(new AuthenticationError('User not found'));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return next(new AuthenticationError('Password is incorrect'));
    }

    // Deactivate account
    user.isActive = false;
    user.refreshToken = null;
    user.deactivatedAt = new Date();
    await user.save();

    res.json({
        success: true,
        message: 'Account deactivated successfully'
    });
});

/**
 * Check if username/email is available
 */
const checkAvailability = catchAsync(async (req, res, next) => {
    const { type, value } = req.query;

    if (!type || !value) {
        return next(new ValidationError('Type and value are required'));
    }

    if (!['username', 'email'].includes(type)) {
        return next(new ValidationError('Type must be username or email'));
    }

    const query = {};
    query[type] = value.toLowerCase();

    const existingUser = await User.findOne(query);

    res.json({
        success: true,
        data: {
            available: !existingUser,
            message: existingUser 
                ? `${type.charAt(0).toUpperCase() + type.slice(1)} is already taken`
                : `${type.charAt(0).toUpperCase() + type.slice(1)} is available`
        }
    });
});

/**
 * Get user statistics
 */
const getUserStats = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userId);
    if (!user) {
        return next(new AuthenticationError('User not found'));
    }

    // Calculate user statistics
    const stats = {
        joinDate: user.registrationDate,
        lastLogin: user.lastLoginDate,
        coursesEnrolled: user.enrolledCourses?.length || 0,
        postsCount: user.postsCount || 0,
        commentsCount: user.commentsCount || 0,
        likesReceived: user.likesReceived || 0,
        documentsShared: user.documentsShared?.length || 0,
        wellnessStreak: user.wellnessStreak || 0
    };

    res.json({
        success: true,
        data: {
            stats
        }
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    logoutAll,
    getProfile,
    updateProfile,
    changePassword,
    deactivateAccount,
    checkAvailability,
    getUserStats
};