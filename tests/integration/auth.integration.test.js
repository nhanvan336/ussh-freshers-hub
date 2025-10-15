// Authentication Integration Tests
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');

describe('Authentication Integration Tests', () => {
  let server;
  let validUserData;
  let authToken;
  let refreshToken;

  beforeAll(async () => {
    // Start the server for integration tests
    server = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    // Close the server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    // Generate fresh user data for each test
    validUserData = global.testUtils.generateUniqueUserData();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Registration successful',
        data: {
          user: expect.objectContaining({
            username: validUserData.username,
            email: validUserData.email,
            fullName: validUserData.fullName,
            studentId: validUserData.studentId
          }),
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      });

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user.username).toBe(validUserData.username);
      expect(user.password).not.toBe(validUserData.password); // Should be hashed
    });

    it('should return 409 for duplicate email', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const duplicateData = {
        ...global.testUtils.generateUniqueUserData(),
        email: validUserData.email
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already registered');
    });

    it('should return 409 for duplicate username', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same username
      const duplicateData = {
        ...global.testUtils.generateUniqueUserData(),
        username: validUserData.username
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Username already taken');
    });

    it('should return 409 for duplicate student ID', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same student ID
      const duplicateData = {
        ...global.testUtils.generateUniqueUserData(),
        studentId: validUserData.studentId
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Student ID already registered');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        username: 'ab', // Too short
        email: 'invalid-email',
        password: '123', // Too short
        fullName: '',
        studentId: '',
        major: 'Invalid Major',
        yearOfStudy: 0 // Invalid year
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);
    });

    it('should login successfully with email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.objectContaining({
            email: validUserData.email
          }),
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      });

      // Store tokens for later tests
      authToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should login successfully with username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUserData.username,
          password: validUserData.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful'
      });
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUserData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@test.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for deactivated account', async () => {
      // Deactivate the user
      await User.findOneAndUpdate(
        { email: validUserData.email },
        { isActive: false }
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account is deactivated');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    beforeEach(async () => {
      // Register and login to get tokens
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      authToken = loginResponse.body.data.tokens.accessToken;
      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      });

      // New tokens should be different from old ones
      expect(response.body.data.tokens.accessToken).not.toBe(authToken);
      expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Refresh token required');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      // Register and login to get tokens
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      authToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout successful'
      });

      // Verify refresh token was cleared
      const user = await User.findOne({ email: validUserData.email });
      expect(user.refreshToken).toBeNull();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      // Register user and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      authToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: expect.objectContaining({
            username: validUserData.username,
            email: validUserData.email,
            fullName: validUserData.fullName,
            studentId: validUserData.studentId
          })
        }
      });

      // Ensure password is not included
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      // Register user and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      authToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should update profile successfully', async () => {
      const updateData = {
        fullName: 'Updated Full Name',
        bio: 'This is my updated bio',
        interests: ['reading', 'coding', 'music']
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: expect.objectContaining({
            fullName: updateData.fullName,
            bio: updateData.bio,
            interests: updateData.interests
          })
        }
      });
    });

    it('should return 400 for no valid updates', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidField: 'value',
          password: 'shouldnotbeallowed'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No valid fields to update');
    });
  });

  describe('POST /api/auth/change-password', () => {
    beforeEach(async () => {
      // Register user and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      authToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: validUserData.password,
          newPassword: 'newSecurePassword123'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password changed successfully. Please log in again.'
      });

      // Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password
        })
        .expect(401);

      // Verify new password works
      await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUserData.email,
          password: 'newSecurePassword123'
        })
        .expect(200);
    });

    it('should return 401 for incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongPassword',
          newPassword: 'newSecurePassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });
  });

  describe('GET /api/auth/check-availability', () => {
    beforeEach(async () => {
      // Register a user to test availability against
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);
    });

    it('should return available for unused username', async () => {
      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({
          type: 'username',
          value: 'availableusername'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          available: true,
          message: 'Username is available'
        }
      });
    });

    it('should return not available for existing username', async () => {
      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({
          type: 'username',
          value: validUserData.username
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          available: false,
          message: 'Username is already taken'
        }
      });
    });

    it('should return available for unused email', async () => {
      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({
          type: 'email',
          value: 'available@test.com'
        })
        .expect(200);

      expect(response.body.data.available).toBe(true);
    });

    it('should return not available for existing email', async () => {
      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({
          type: 'email',
          value: validUserData.email
        })
        .expect(200);

      expect(response.body.data.available).toBe(false);
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({
          type: 'invalid',
          value: 'test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/stats', () => {
    beforeEach(async () => {
      // Register user and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      authToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should get user stats successfully', async () => {
      const response = await request(app)
        .get('/api/auth/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          stats: expect.objectContaining({
            joinDate: expect.any(String),
            lastLogin: expect.any(String),
            coursesEnrolled: expect.any(Number),
            postsCount: expect.any(Number),
            commentsCount: expect.any(Number),
            likesReceived: expect.any(Number),
            documentsShared: expect.any(Number),
            wellnessStreak: expect.any(Number)
          })
        }
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/auth/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
