// Error Handling Middleware
const mongoose = require('mongoose');

/**
 * Custom Error Classes
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
    }
}

/**
 * Handle MongoDB Cast Errors
 */
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new ValidationError(message);
};

/**
 * Handle MongoDB Duplicate Field Errors
 */
const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' already exists. Please use a different value.`;
    return new ConflictError(message);
};

/**
 * Handle MongoDB Validation Errors
 */
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    return new ValidationError(message);
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () => {
    return new AuthenticationError('Invalid token. Please log in again.');
};

const handleJWTExpiredError = () => {
    return new AuthenticationError('Your token has expired. Please log in again.');
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
    // API Error
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            success: false,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }

    // Rendered Website Error
    console.error('ERROR 💥', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message,
        error: err
    });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
    // API Error
    if (req.originalUrl.startsWith('/api')) {
        // Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message
            });
        }

        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥', err);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong!'
        });
    }

    // Rendered Website Error
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });
};

/**
 * Main Error Handling Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Handle specific error types
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};

/**
 * Catch async errors wrapper
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Handle unhandled routes (404)
 */
const handleNotFound = (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: `Can't find ${req.originalUrl} on this server!`
        });
    }

    // For web routes, render 404 page
    res.status(404).render('error', {
        title: 'Page Not Found',
        msg: `The page ${req.originalUrl} could not be found.`
    });
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };

        // Log API requests
        if (req.originalUrl.startsWith('/api')) {
            console.log(`API ${logData.method} ${logData.url} - ${logData.status} - ${logData.duration}`);
        }

        // Log errors
        if (res.statusCode >= 400) {
            console.error('Request Error:', logData);
        }
    });

    next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // API specific headers
    if (req.originalUrl.startsWith('/api')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
};

/**
 * CORS middleware for API routes
 */
const corsForAPI = (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',') 
            : ['http://localhost:3000', 'http://localhost:3001'];
        
        const origin = req.headers.origin;
        
        if (allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
    }
    
    next();
};

module.exports = {
    // Error Classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    
    // Error Handlers
    globalErrorHandler,
    handleNotFound,
    catchAsync,
    
    // Utility Middlewares
    requestLogger,
    securityHeaders,
    corsForAPI
};