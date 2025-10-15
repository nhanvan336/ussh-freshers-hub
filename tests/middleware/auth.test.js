// Authentication Middleware Tests
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { 
  generateTokens, 
  verifyToken, 
  authenticate 
} = require('../../middleware/auth');

describe('Auth Middleware', () => {
  let mockUser;
  let userId;

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId();
    mockUser = {
      _id: userId,
      username: 'testuser',
      email: 'test@ussh.edu.vn',
      isActive: true,
      toObject: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', () => {
      const tokens = generateTokens(userId);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');

      // Verify tokens can be decoded
      const accessPayload = jwt.decode(tokens.accessToken);
      const refreshPayload = jwt.decode(tokens.refreshToken);

      expect(accessPayload.userId).toBe(userId.toString());
      expect(refreshPayload.userId).toBe(userId.toString());
      expect(accessPayload.timestamp).toBeDefined();
      expect(refreshPayload.timestamp).toBeDefined();
    });

    it('should generate different tokens for different users', () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();

      const tokens1 = generateTokens(userId1);
      const tokens2 = generateTokens(userId2);

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    it('should generate tokens with proper expiration times', () => {
      const tokens = generateTokens(userId);

      const accessPayload = jwt.decode(tokens.accessToken);
      const refreshPayload = jwt.decode(tokens.refreshToken);

      // Access token should expire in 15 minutes (900 seconds)
      const accessExpiry = accessPayload.exp - accessPayload.iat;
      expect(accessExpiry).toBe(900); // 15 minutes

      // Refresh token should expire in 7 days (604800 seconds)
      const refreshExpiry = refreshPayload.exp - refreshPayload.iat;
      expect(refreshExpiry).toBe(604800); // 7 days
    });
  });

  describe('verifyToken', () => {
    let validToken;
    let refreshToken;

    beforeEach(() => {
      const tokens = generateTokens(userId);
      validToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    });

    it('should verify valid access token', () => {
      const payload = verifyToken(validToken);

      expect(payload).toBeTruthy();
      expect(payload.userId).toBe(userId.toString());
      expect(payload.timestamp).toBeDefined();
    });

    it('should verify valid refresh token with refresh secret', () => {
      const payload = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

      expect(payload).toBeTruthy();
      expect(payload.userId).toBe(userId.toString());
    });

    it('should return null for invalid token', () => {
      const payload = verifyToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: userId.toString(), timestamp: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      const payload = verifyToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { userId: userId.toString() },
        'wrong-secret',
        { expiresIn: '15m' }
      );

      const payload = verifyToken(wrongSecretToken);
      expect(payload).toBeNull();
    });
  });

  describe('authenticate middleware', () => {
    let req, res, next;
    let validToken;

    beforeEach(() => {
      const tokens = generateTokens(userId);
      validToken = tokens.accessToken;

      req = global.testUtils.mockRequest();
      res = global.testUtils.mockResponse();
      next = global.testUtils.mockNext();
    });

    it('should authenticate user with valid token', async () => {
      req.headers.authorization = `Bearer ${validToken}`;
      
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await authenticate(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(req.user).toEqual(mockUser);
      expect(req.userId).toEqual(userId);
      expect(next).toHaveBeenCalledWith(); // Called without error
    });

    it('should return 401 for missing authorization header', async () => {
      // No authorization header
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
    });

    it('should return 401 for malformed authorization header', async () => {
      req.headers.authorization = 'Invalid header format';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
    });

    it('should return 401 for authorization header without Bearer prefix', async () => {
      req.headers.authorization = validToken; // Missing "Bearer " prefix

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
    });

    it('should return 401 for invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token'
      });
    });

    it('should return 401 for expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token'
      });
    });

    it('should return 401 if user not found in database', async () => {
      req.headers.authorization = `Bearer ${validToken}`;
      
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should return 401 for inactive user', async () => {
      req.headers.authorization = `Bearer ${validToken}`;
      
      const inactiveUser = { ...mockUser, isActive: false };
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(inactiveUser)
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is deactivated'
      });
    });

    it('should return 500 for database errors', async () => {
      req.headers.authorization = `Bearer ${validToken}`;
      
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      // Spy on console.error to suppress error logs during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed'
      });

      consoleSpy.mockRestore();
    });

    it('should handle tokens with malformed userId', async () => {
      // Create token with invalid userId
      const invalidToken = jwt.sign(
        { userId: 'invalid-object-id' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      req.headers.authorization = `Bearer ${invalidToken}`;
      
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Cast error'))
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed'
      });

      consoleSpy.mockRestore();
    });

    it('should extract token correctly from Bearer header', async () => {
      const testToken = 'test.jwt.token';
      req.headers.authorization = `Bearer ${testToken}`;

      // Mock verifyToken to return null to trigger invalid token response
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token'
      });
    });
  });

  describe('Token lifecycle', () => {
    it('should maintain token consistency across operations', () => {
      const tokens1 = generateTokens(userId);
      const tokens2 = generateTokens(userId);

      // Different tokens for same user (due to timestamp)
      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);

      // But both should verify with same userId
      const payload1 = verifyToken(tokens1.accessToken);
      const payload2 = verifyToken(tokens2.accessToken);

      expect(payload1.userId).toBe(payload2.userId);
    });

    it('should handle concurrent token generation', () => {
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(generateTokens(userId))
      );

      return Promise.all(promises).then(tokensArray => {
        // All tokens should be valid
        tokensArray.forEach(tokens => {
          expect(verifyToken(tokens.accessToken)).toBeTruthy();
          expect(verifyToken(tokens.refreshToken, process.env.JWT_REFRESH_SECRET)).toBeTruthy();
        });

        // All access tokens should be unique
        const accessTokens = tokensArray.map(t => t.accessToken);
        const uniqueAccessTokens = [...new Set(accessTokens)];
        expect(uniqueAccessTokens.length).toBe(accessTokens.length);

        // All refresh tokens should be unique
        const refreshTokens = tokensArray.map(t => t.refreshToken);
        const uniqueRefreshTokens = [...new Set(refreshTokens)];
        expect(uniqueRefreshTokens.length).toBe(refreshTokens.length);
      });
    });
  });
});
