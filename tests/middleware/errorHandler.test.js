// Error Handler Middleware Tests
const {
  AppError,
  AuthenticationError,
  ConflictError,
  ValidationError,
  NotFoundError,
  catchAsync,
  globalErrorHandler
} = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  describe('Error Classes', () => {
    describe('AppError', () => {
      it('should create error with correct properties', () => {
        const message = 'Test error message';
        const statusCode = 400;
        const error = new AppError(message, statusCode);

        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(statusCode);
        expect(error.status).toBe('error');
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(Error);
      });

      it('should default to 500 status code', () => {
        const error = new AppError('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.status).toBe('error');
      });

      it('should set status to "fail" for 4xx codes', () => {
        const error400 = new AppError('Bad request', 400);
        const error404 = new AppError('Not found', 404);
        
        expect(error400.status).toBe('fail');
        expect(error404.status).toBe('fail');
      });

      it('should set status to "error" for 5xx codes', () => {
        const error500 = new AppError('Internal error', 500);
        const error503 = new AppError('Service unavailable', 503);
        
        expect(error500.status).toBe('error');
        expect(error503.status).toBe('error');
      });
    });

    describe('AuthenticationError', () => {
      it('should create authentication error with 401 status', () => {
        const message = 'Authentication failed';
        const error = new AuthenticationError(message);

        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(401);
        expect(error.status).toBe('fail');
        expect(error).toBeInstanceOf(AppError);
      });

      it('should use default message', () => {
        const error = new AuthenticationError();
        expect(error.message).toBe('Authentication failed');
      });
    });

    describe('ConflictError', () => {
      it('should create conflict error with 409 status', () => {
        const message = 'Resource already exists';
        const error = new ConflictError(message);

        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(409);
        expect(error.status).toBe('fail');
        expect(error).toBeInstanceOf(AppError);
      });

      it('should use default message', () => {
        const error = new ConflictError();
        expect(error.message).toBe('Resource conflict');
      });
    });

    describe('ValidationError', () => {
      it('should create validation error with 400 status', () => {
        const message = 'Invalid input data';
        const error = new ValidationError(message);

        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(400);
        expect(error.status).toBe('fail');
        expect(error).toBeInstanceOf(AppError);
      });

      it('should use default message', () => {
        const error = new ValidationError();
        expect(error.message).toBe('Invalid input data');
      });
    });

    describe('NotFoundError', () => {
      it('should create not found error with 404 status', () => {
        const message = 'Resource not found';
        const error = new NotFoundError(message);

        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(404);
        expect(error.status).toBe('fail');
        expect(error).toBeInstanceOf(AppError);
      });

      it('should use default message', () => {
        const error = new NotFoundError();
        expect(error.message).toBe('Resource not found');
      });
    });
  });

  describe('catchAsync', () => {
    it('should call next function on success', async () => {
      const asyncFunction = catchAsync(async (req, res, next) => {
        res.json({ success: true });
      });

      await asyncFunction(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch and pass async errors to next', async () => {
      const testError = new Error('Async error');
      const asyncFunction = catchAsync(async (req, res, next) => {
        throw testError;
      });

      await asyncFunction(req, res, next);

      expect(next).toHaveBeenCalledWith(testError);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should catch AppError and pass to next', async () => {
      const appError = new AppError('Custom app error', 400);
      const asyncFunction = catchAsync(async (req, res, next) => {
        throw appError;
      });

      await asyncFunction(req, res, next);

      expect(next).toHaveBeenCalledWith(appError);
    });

    it('should handle Promise rejection', async () => {
      const rejectionError = new Error('Promise rejected');
      const asyncFunction = catchAsync(async (req, res, next) => {
        return Promise.reject(rejectionError);
      });

      await asyncFunction(req, res, next);

      expect(next).toHaveBeenCalledWith(rejectionError);
    });

    it('should preserve function context', async () => {
      let contextTest = false;
      const asyncFunction = catchAsync(async function(req, res, next) {
        contextTest = (this === undefined); // Should be true in strict mode
        res.json({ contextTest });
      });

      await asyncFunction(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ contextTest: true });
    });
  });

  describe('globalErrorHandler', () => {
    let consoleSpy;

    beforeEach(() => {
      // Mock console.error to suppress error logs during tests
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should handle operational AppError in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const appError = new AppError('Operational error', 400);
      globalErrorHandler(appError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operational error'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle operational AppError in development with stack', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const appError = new AppError('Development error', 400);
      globalErrorHandler(appError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Development error',
        stack: expect.any(String)
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-operational errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const regularError = new Error('System error');
      globalErrorHandler(regularError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong!'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-operational errors in development with details', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const regularError = new Error('System error');
      globalErrorHandler(regularError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'System error',
        stack: expect.any(String)
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle validation errors from express-validator', () => {
      const validationError = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password too short' }
        }
      };

      globalErrorHandler(validationError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Object)
      });
    });

    it('should handle MongoDB duplicate key error', () => {
      const duplicateError = {
        name: 'MongoError',
        code: 11000,
        keyValue: { email: 'test@example.com' }
      };

      globalErrorHandler(duplicateError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Duplicate field value: email already exists'
      });
    });

    it('should handle MongoDB cast error', () => {
      const castError = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id'
      };

      globalErrorHandler(castError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid _id format'
      });
    });

    it('should handle JWT errors', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid token'
      };

      globalErrorHandler(jwtError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid authentication token'
      });
    });

    it('should handle JWT expired error', () => {
      const expiredError = {
        name: 'TokenExpiredError',
        message: 'jwt expired'
      };

      globalErrorHandler(expiredError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication token expired'
      });
    });

    it('should handle specific error types correctly', () => {
      const authError = new AuthenticationError('Auth failed');
      globalErrorHandler(authError, req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);

      const conflictError = new ConflictError('Conflict occurred');
      globalErrorHandler(conflictError, req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);

      const validationError = new ValidationError('Validation failed');
      globalErrorHandler(validationError, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      const notFoundError = new NotFoundError('Not found');
      globalErrorHandler(notFoundError, req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should log errors to console', () => {
      const testError = new Error('Test error for logging');
      globalErrorHandler(testError, req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('Error:', testError);
    });

    it('should handle errors without message', () => {
      const errorWithoutMessage = {};
      globalErrorHandler(errorWithoutMessage, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong!'
      });
    });

    it('should handle errors with custom statusCode but no isOperational flag', () => {
      const customError = new Error('Custom error');
      customError.statusCode = 422;

      globalErrorHandler(customError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500); // Should default to 500 since not operational
    });
  });

  describe('Error handling integration', () => {
    it('should work with catchAsync and globalErrorHandler together', async () => {
      const asyncFunction = catchAsync(async (req, res, next) => {
        throw new ValidationError('Invalid data provided');
      });

      // Simulate the async function call
      await asyncFunction(req, res, next);

      // Verify next was called with the error
      expect(next).toHaveBeenCalled();
      const passedError = next.mock.calls[0][0];
      expect(passedError).toBeInstanceOf(ValidationError);

      // Now simulate the global error handler
      globalErrorHandler(passedError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid data provided'
      });
    });

    it('should handle nested async operations', async () => {
      const nestedAsyncFunction = catchAsync(async (req, res, next) => {
        const promise1 = Promise.reject(new AuthenticationError('Auth failed'));
        const promise2 = Promise.resolve('success');
        
        try {
          await Promise.all([promise1, promise2]);
        } catch (error) {
          throw error;
        }
      });

      await nestedAsyncFunction(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AuthenticationError);
    });
  });
});
