// Test Setup File
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Setup test database before all tests
beforeAll(async () => {
  try {
    // Create in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Connect to in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
});

// Clean up database between tests
beforeEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Database cleanup error:', error);
  }
});

// Close database connection after all tests
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongod) {
      await mongod.stop();
    }
    console.log('Test database disconnected successfully');
  } catch (error) {
    console.error('Database disconnection error:', error);
  }
});

// Global test utilities
global.testUtils = {
  // Mock user data
  validUserData: {
    username: 'testuser123',
    email: 'test@ussh.edu.vn',
    password: 'securePassword123',
    fullName: 'Test User',
    studentId: 'ST2025001',
    major: 'Vietnamese Literature',
    yearOfStudy: 1
  },
  
  // Mock admin user data
  validAdminData: {
    username: 'admin123',
    email: 'admin@ussh.edu.vn',
    password: 'adminPassword123',
    fullName: 'Admin User',
    studentId: 'AD2025001',
    major: 'History',
    yearOfStudy: 4,
    role: 'admin'
  },

  // Generate unique test data
  generateUniqueUserData: () => {
    const timestamp = Date.now();
    return {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@ussh.edu.vn`,
      password: 'securePassword123',
      fullName: `Test User ${timestamp}`,
      studentId: `ST${timestamp}`,
      major: 'Vietnamese Literature',
      yearOfStudy: 1
    };
  },

  // Mock request object
  mockRequest: (data = {}) => ({
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    headers: data.headers || {},
    user: data.user || null,
    userId: data.userId || null,
    ...data
  }),

  // Mock response object
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },

  // Mock next function
  mockNext: () => jest.fn(),

  // Extract error from next function call
  getNextError: (next) => {
    const calls = next.mock.calls;
    return calls.length > 0 ? calls[0][0] : null;
  }
};

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

// Suppress console logs during testing (optional)
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}
