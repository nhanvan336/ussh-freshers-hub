// Authentication Controller Unit Tests
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import modules to test
const authController = require('../../controllers/authController');
const User = require('../../models/User');
const { generateTokens, verifyToken } = require('../../middleware/auth');

// Import error classes
const { 
  AppError, 
  AuthenticationError, 
  ConflictError,
  ValidationError 
} = require('../../middleware/errorHandler');

describe('AuthController', () => {
  let mockUser;
  let validUserData;

  beforeEach(() => {
    // Create fresh test data for each test
    validUserData = global.testUtils.generateUniqueUserData();
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      ...validUserData,
      registrationDate: new Date(),
      lastLoginDate: new Date(),
      isActive: true,
      refreshToken: null,
      toObject: jest.fn().mockReturnThis(),
      save: jest.fn().mockResolvedValue(true)
    };
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const req = global.testUtils.mockRequest({
        body: validUserData
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // Mock User.findOne to return null (no existing user)
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      
      // Mock User constructor and save
      const saveSpy = jest.fn().mockResolvedValue(mockUser);
      jest.spyOn(User.prototype, 'save').mockImplementation(saveSpy);

      // Mock bcrypt.hash
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword123');

      await authController.register(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [
          { email: validUserData.email.toLowerCase() },
          { username: validUserData.username.toLowerCase() }
        ]
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(validUserData.password, 12);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Registration successful',
          data: expect.objectContaining({
            user: expect.any(Object),
            tokens: expect.objectContaining({
              accessToken: expect.any(String),
              refreshToken: expect.any(String)
            })
          })
        })
      );
    });

    it('should return conflict error if email already exists', async () => {
      const req = global.testUtils.mockRequest({
        body: validUserData
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // Mock existing user with same email
      const existingUser = { email: validUserData.email.toLowerCase() };
      jest.spyOn(User, 'findOne').mockResolvedValue(existingUser);

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(ConflictError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Email already registered');
    });

    it('should return conflict error if username already exists', async () => {
      const req = global.testUtils.mockRequest({
        body: validUserData
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // Mock existing user with same username
      const existingUser = { username: validUserData.username.toLowerCase() };
      jest.spyOn(User, 'findOne').mockResolvedValue(existingUser);

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(ConflictError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Username already taken');
    });

    it('should return conflict error if student ID already exists', async () => {
      const req = global.testUtils.mockRequest({
        body: validUserData
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // Mock no existing user by email/username
      jest.spyOn(User, 'findOne')
        .mockResolvedValueOnce(null) // First call for email/username check
        .mockResolvedValueOnce({ studentId: validUserData.studentId }); // Second call for student ID check

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(ConflictError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Student ID already registered');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials (email)', async () => {
      const req = global.testUtils.mockRequest({
        body: {
          identifier: validUserData.email,
          password: validUserData.password
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // Mock user with password field
      const userWithPassword = {
        ...mockUser,
        password: 'hashedPassword123',
        select: jest.fn().mockReturnThis()
      };
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithPassword)
      });

      // Mock bcrypt.compare
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authController.login(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [
          { email: validUserData.email.toLowerCase() },
          { username: validUserData.email.toLowerCase() }
        ]
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(validUserData.password, 'hashedPassword123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          data: expect.objectContaining({
            user: expect.any(Object),
            tokens: expect.objectContaining({
              accessToken: expect.any(String),
              refreshToken: expect.any(String)
            })
          })
        })
      );
    });

    it('should successfully login with valid credentials (username)', async () => {
      const req = global.testUtils.mockRequest({
        body: {
          identifier: validUserData.username,
          password: validUserData.password
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const userWithPassword = {
        ...mockUser,
        password: 'hashedPassword123',
        select: jest.fn().mockReturnThis()
      };
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithPassword)
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authController.login(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [
          { email: validUserData.username.toLowerCase() },
          { username: validUserData.username.toLowerCase() }
        ]
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful'
        })
      );
    });

    it('should return authentication error for non-existent user', async () => {
      const req = global.testUtils.mockRequest({
        body: {
          identifier: 'nonexistent@test.com',
          password: 'password123'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Invalid credentials');
    });

    it('should return authentication error for inactive user', async () => {
      const req = global.testUtils.mockRequest({
        body: {
          identifier: validUserData.email,
          password: validUserData.password
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const inactiveUser = {
        ...mockUser,
        isActive: false,
        password: 'hashedPassword123'
      };
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(inactiveUser)
      });

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Account is deactivated. Please contact support.');
    });

    it('should return authentication error for invalid password', async () => {
      const req = global.testUtils.mockRequest({
        body: {
          identifier: validUserData.email,
          password: 'wrongPassword'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const userWithPassword = {
        ...mockUser,
        password: 'hashedPassword123'
      };
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithPassword)
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const refreshToken = 'validRefreshToken123';
      const req = global.testUtils.mockRequest({
        body: { refreshToken }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const decodedToken = { userId: mockUser._id };
      jest.spyOn(jwt, 'verify').mockReturnValue(decodedToken);
      
      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: 'hashedRefreshToken'
      };
      jest.spyOn(User, 'findById').mockResolvedValue(userWithRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authController.refreshToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, process.env.JWT_REFRESH_SECRET);
      expect(User.findById).toHaveBeenCalledWith(decodedToken.userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(refreshToken, 'hashedRefreshToken');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token refreshed successfully',
          data: expect.objectContaining({
            tokens: expect.objectContaining({
              accessToken: expect.any(String),
              refreshToken: expect.any(String)
            })
          })
        })
      );
    });

    it('should return authentication error if refresh token is missing', async () => {
      const req = global.testUtils.mockRequest({
        body: {}
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authController.refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Refresh token required');
    });

    it('should return authentication error for invalid refresh token', async () => {
      const req = global.testUtils.mockRequest({
        body: { refreshToken: 'invalidToken' }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const req = global.testUtils.mockRequest({
        userId: mockUser._id
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      await authController.logout(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should handle logout even if user not found', async () => {
      const req = global.testUtils.mockRequest({
        userId: new mongoose.Types.ObjectId()
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(User, 'findById').mockResolvedValue(null);

      await authController.logout(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });

  describe('logoutAll', () => {
    it('should successfully logout from all devices', async () => {
      const req = global.testUtils.mockRequest({
        userId: mockUser._id
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const userWithTokenVersion = {
        ...mockUser,
        tokenVersion: 1
      };
      jest.spyOn(User, 'findById').mockResolvedValue(userWithTokenVersion);

      await authController.logoutAll(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(userWithTokenVersion.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out from all devices'
      });
    });
  });

  describe('getProfile', () => {
    it('should successfully get user profile', async () => {
      const req = global.testUtils.mockRequest({
        userId: mockUser._id
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(User, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUser)
        })
      });

      await authController.getProfile(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.any(Object)
        }
      });
    });

    it('should return authentication error if user not found', async () => {
      const req = global.testUtils.mockRequest({
        userId: new mongoose.Types.ObjectId()
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(User, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await authController.getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const updateData = {
        fullName: 'Updated Name',
        bio: 'Updated bio',
        interests: ['reading', 'coding']
      };
      const req = global.testUtils.mockRequest({
        userId: mockUser._id,
        body: updateData
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const updatedUser = { ...mockUser, ...updateData };
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updatedUser);

      await authController.updateProfile(req, res, next);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: expect.any(Object)
        }
      });
    });

    it('should return validation error for no valid fields', async () => {
      const req = global.testUtils.mockRequest({
        userId: mockUser._id,
        body: {
          invalidField: 'value',
          anotherInvalid: 'value2'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authController.updateProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('No valid fields to update');
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const req = global.testUtils.mockRequest({
        userId: mockUser._id,
        body: {
          currentPassword: 'oldPassword',
          newPassword: 'newPassword123'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const userWithPassword = {
        ...mockUser,
        password: 'hashedOldPassword'
      };
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithPassword)
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedNewPassword');

      await authController.changePassword(req, res, next);

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'hashedOldPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
      expect(userWithPassword.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully. Please log in again.'
      });
    });

    it('should return authentication error for incorrect current password', async () => {
      const req = global.testUtils.mockRequest({
        userId: mockUser._id,
        body: {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const userWithPassword = {
        ...mockUser,
        password: 'hashedOldPassword'
      };
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithPassword)
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await authController.changePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Current password is incorrect');
    });
  });

  describe('checkAvailability', () => {
    it('should return available for unused username', async () => {
      const req = global.testUtils.mockRequest({
        query: {
          type: 'username',
          value: 'newuser123'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      await authController.checkAvailability(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ username: 'newuser123' });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          available: true,
          message: 'Username is available'
        }
      });
    });

    it('should return not available for existing email', async () => {
      const req = global.testUtils.mockRequest({
        query: {
          type: 'email',
          value: 'existing@test.com'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      jest.spyOn(User, 'findOne').mockResolvedValue({ email: 'existing@test.com' });

      await authController.checkAvailability(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          available: false,
          message: 'Email is already taken'
        }
      });
    });

    it('should return validation error for invalid type', async () => {
      const req = global.testUtils.mockRequest({
        query: {
          type: 'invalid',
          value: 'test'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authController.checkAvailability(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
      const error = global.testUtils.getNextError(next);
      expect(error.message).toBe('Type must be username or email');
    });
  });

  describe('getUserStats', () => {
    it('should successfully get user statistics', async () => {
      const req = global.testUtils.mockRequest({
        userId: mockUser._id
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const userWithStats = {
        ...mockUser,
        enrolledCourses: ['course1', 'course2'],
        postsCount: 5,
        commentsCount: 10,
        likesReceived: 15,
        documentsShared: ['doc1'],
        wellnessStreak: 7
      };
      jest.spyOn(User, 'findById').mockResolvedValue(userWithStats);

      await authController.getUserStats(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          stats: expect.objectContaining({
            joinDate: expect.any(Date),
            lastLogin: expect.any(Date),
            coursesEnrolled: 2,
            postsCount: 5,
            commentsCount: 10,
            likesReceived: 15,
            documentsShared: 1,
            wellnessStreak: 7
          })
        }
      });
    });
  });
});
