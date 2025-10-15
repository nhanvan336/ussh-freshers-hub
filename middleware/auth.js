// Authentication Middleware
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'ussh-freshers-hub-secret-key-2025';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'ussh-refresh-secret-key-2025';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate JWT tokens (access + refresh)
 */
const generateTokens = (userId) => {
    const payload = { userId, timestamp: Date.now() };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { 
        expiresIn: ACCESS_TOKEN_EXPIRY 
    });
    
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
        expiresIn: REFRESH_TOKEN_EXPIRY 
    });
    
    return { accessToken, refreshToken };
};

/**
 * Verify JWT token
 */
const verifyToken = (token, secret = JWT_SECRET) => {
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

/**
 * Simple authentication check for web routes
 * Uses Passport.js session-based authentication
 */
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    
    // If API request, return JSON error
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    // For web routes, redirect to login
    req.flash('error', 'Bạn cần đăng nhập để truy cập trang này.');
    res.redirect('/auth/login');
};

/**
 * Authentication middleware for API routes
 * Protects routes that require user authentication
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }
        
        // Add user to request object
        req.user = user;
        req.userId = user._id;
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            
            if (decoded) {
                const user = await User.findById(decoded.userId).select('-password');
                if (user && user.isActive) {
                    req.user = user;
                    req.userId = user._id;
                }
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        
        next();
    };
};

/**
 * Admin only middleware
 */
const adminOnly = authorize('admin');

/**
 * Moderator or Admin middleware
 */
const moderatorOrAdmin = authorize('moderator', 'admin');

/**
 * Verified student middleware
 * Checks if user is authenticated and has student role with verified status
 */
const isVerifiedStudent = (req, res, next) => {
    if (!req.isAuthenticated()) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        req.flash('error', 'Bạn cần đăng nhập để truy cập trang này.');
        return res.redirect('/auth/login');
    }
    
    const user = req.user;
    if (user.role === 'student' && user.isVerified) {
        return next();
    }
    
    if (req.path.startsWith('/api/')) {
        return res.status(403).json({
            success: false,
            message: 'Verified student access required'
        });
    }
    
    req.flash('error', 'Chỉ sinh viên đã xác thực mới có thể truy cập trang này.');
    res.redirect('/');
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();
    
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        // Clean old attempts
        for (const [ip, data] of attempts.entries()) {
            if (now - data.firstAttempt > windowMs) {
                attempts.delete(ip);
            }
        }
        
        const userAttempts = attempts.get(key);
        
        if (!userAttempts) {
            attempts.set(key, { count: 1, firstAttempt: now });
            return next();
        }
        
        if (userAttempts.count >= maxAttempts) {
            return res.status(429).json({
                success: false,
                message: 'Too many authentication attempts. Please try again later.',
                retryAfter: Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000)
            });
        }
        
        userAttempts.count++;
        next();
    };
};

/**
 * Specific rate limiters for different auth endpoints
 */
const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per window
    message: 'Too many login attempts. Please try again in 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false
});

const registerRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registration attempts per hour
    message: 'Too many registration attempts. Please try again in 1 hour.',
    standardHeaders: true,
    legacyHeaders: false
});

const postRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 posts per window
    message: 'Too many posts. Please try again in 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false
});

const commentRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // 30 comments per window
    message: 'Too many comments. Please try again in 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generateTokens,
    verifyToken,
    authenticate,
    isAuthenticated,
    isVerifiedStudent,
    optionalAuth,
    authorize,
    adminOnly,
    moderatorOrAdmin,
    authRateLimit,
    loginRateLimit,
    registerRateLimit,
    postRateLimit,
    commentRateLimit,
    JWT_SECRET,
    JWT_REFRESH_SECRET
};