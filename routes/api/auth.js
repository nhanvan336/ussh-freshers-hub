// Authentication API Routes
const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../../controllers/authController');

// Import middleware
const { authenticate, authRateLimit } = require('../../middleware/auth');
const {
    validateUserRegistration,
    validateUserLogin,
    validatePasswordChange,
    validateProfileUpdate,
    handleValidationErrors
} = require('../../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', 
    authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
    validateUserRegistration,
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
    authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
    validateUserLogin,
    authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear refresh token)
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
    authenticate,
    validateProfileUpdate,
    authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password',
    authenticate,
    validatePasswordChange,
    authController.changePassword
);

/**
 * @route   POST /api/auth/deactivate
 * @desc    Deactivate user account
 * @access  Private
 */
router.post('/deactivate', authenticate, authController.deactivateAccount);

/**
 * @route   GET /api/auth/check-availability
 * @desc    Check if username/email is available
 * @access  Public
 */
router.get('/check-availability', authController.checkAvailability);

/**
 * @route   GET /api/auth/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticate, authController.getUserStats);

module.exports = router;