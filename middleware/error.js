const mongoose = require('mongoose');

// Global error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { statusCode: 404, message };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    if (field === 'email') {
      message = 'Email already exists';
    } else if (field === 'username') {
      message = 'Username already taken';
    } else if (field === 'studentId') {
      message = 'Student ID already registered';
    }
    
    error = { statusCode: 400, message };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { statusCode: 400, message };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { statusCode: 401, message };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { statusCode: 401, message };
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { statusCode: 400, message };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Too many files or invalid field name';
    error = { statusCode: 400, message };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Send appropriate response based on request type
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    // JSON response for API requests
    res.status(statusCode).json({
      success: false,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  } else {
    // Render error page for regular requests
    res.status(statusCode).render('pages/error', {
      title: `Error ${statusCode} - USSH Freshers Hub`,
      message: message,
      statusCode: statusCode,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database connection error handler
const handleDatabaseError = (err) => {
  console.error('Database connection error:', err);
  
  // Attempt to reconnect
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected! Attempting to reconnect...');
    setTimeout(() => {
      mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }, 5000);
  });
};

// Process uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Process unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error('Stack:', err.stack);
  
  // Close server gracefully
  process.exit(1);
});

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  handleDatabaseError
};