# USSH Freshers Hub - Testing Framework

This comprehensive testing framework ensures the reliability and quality of the USSH Freshers Hub application through unit tests, integration tests, and code coverage analysis.

## 📁 Test Structure

```
tests/
├── setup.js                     # Test environment configuration
├── controllers/                 # Controller unit tests
│   └── authController.test.js   # Authentication controller tests
├── middleware/                  # Middleware unit tests
│   ├── auth.test.js            # Authentication middleware tests
│   └── errorHandler.test.js    # Error handling middleware tests
├── models/                     # Model unit tests
│   └── User.test.js           # User model tests
├── services/                   # Service unit tests (when added)
└── integration/                # Integration tests
    └── auth.integration.test.js # Authentication API integration tests
```

## 🧪 Test Types

### Unit Tests
- **Controllers**: Test business logic and request handling
- **Middleware**: Test authentication, validation, and error handling
- **Models**: Test data validation, methods, and database operations
- **Services**: Test utility functions and external integrations

### Integration Tests
- **API Endpoints**: Test complete request-response cycles
- **Database Operations**: Test actual database interactions
- **Authentication Flow**: Test complete auth workflows

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run authentication-related tests only
npm run test:auth

# Run tests for CI/CD (no watch, with coverage)
npm run test:ci
```

### Advanced Test Runner

```bash
# Run comprehensive test suite with detailed reporting
node scripts/run-tests.js

# Run specific test types
node scripts/run-tests.js --unit
node scripts/run-tests.js --integration
node scripts/run-tests.js --coverage

# Get help
node scripts/run-tests.js --help
```

## 📊 Coverage Goals

Our testing framework aims for high code coverage:

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Terminal**: Summary displayed after test runs
- **HTML**: Detailed report in `coverage/lcov-report/index.html`
- **LCOV**: Machine-readable format in `coverage/lcov.info`

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/__tests__/**/*.test.js'
  ],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'models/**/*.js'
  ],
  coverageDirectory: 'coverage',
  testTimeout: 10000
};
```

### Test Environment Setup (`tests/setup.js`)

- **MongoDB Memory Server**: In-memory database for isolated testing
- **Global Utilities**: Helper functions for mocking and test data
- **Environment Variables**: Test-specific configuration
- **Database Cleanup**: Automatic cleanup between tests

## 🛠️ Test Utilities

### Global Test Utilities (`global.testUtils`)

```javascript
// Mock user data generation
const userData = global.testUtils.generateUniqueUserData();

// Mock request/response objects
const req = global.testUtils.mockRequest({ body: { username: 'test' } });
const res = global.testUtils.mockResponse();
const next = global.testUtils.mockNext();

// Extract errors from next function
const error = global.testUtils.getNextError(next);
```

### Sample User Data

```javascript
// Valid user data template
const validUserData = {
  username: 'testuser123',
  email: 'test@ussh.edu.vn',
  password: 'securePassword123',
  fullName: 'Test User',
  studentId: 'ST2025001',
  major: 'Vietnamese Literature',
  yearOfStudy: 1
};
```

## 📝 Writing Tests

### Controller Tests

```javascript
describe('AuthController', () => {
  describe('register', () => {
    it('should successfully register a new user', async () => {
      const req = global.testUtils.mockRequest({
        body: validUserData
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // Mock dependencies
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      
      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Registration successful'
        })
      );
    });
  });
});
```

### Integration Tests

```javascript
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
          email: validUserData.email
        }),
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      }
    });
  });
});
```

### Model Tests

```javascript
describe('User Model', () => {
  describe('User Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(validUserData.username);
      expect(savedUser.password).not.toBe(validUserData.password); // Should be hashed
    });
  });
});
```

## 🔍 Debugging Tests

### Common Issues and Solutions

1. **Database Connection Issues**
   ```bash
   # Ensure MongoDB Memory Server is properly configured
   # Check tests/setup.js for database setup
   ```

2. **Test Isolation Problems**
   ```javascript
   // Ensure proper cleanup in beforeEach/afterEach
   beforeEach(async () => {
     await User.deleteMany({});
   });
   ```

3. **Async/Await Issues**
   ```javascript
   // Always use async/await or return promises
   it('should handle async operations', async () => {
     const result = await someAsyncFunction();
     expect(result).toBeDefined();
   });
   ```

### Debug Mode

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/controllers/authController.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should register"
```

## 📈 Test Metrics

### Current Coverage Status

The test suite covers:
- ✅ Authentication Controller (100% functions)
- ✅ Authentication Middleware (100% functions)
- ✅ Error Handler Middleware (100% functions)
- ✅ User Model (100% functions)
- ✅ Integration Tests for Auth API (100% endpoints)

### Performance Benchmarks

- **Unit Tests**: < 5 seconds
- **Integration Tests**: < 15 seconds
- **Full Test Suite**: < 30 seconds
- **Coverage Generation**: < 10 seconds

## 🚨 Continuous Integration

### Pre-commit Hooks (Recommended)

```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit test hook
npx husky add .husky/pre-commit "npm run test:ci"
```

### CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v1
        with:
          file: ./coverage/lcov.info
```

## 📚 Best Practices

### Test Writing Guidelines

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow the AAA pattern
3. **Test Isolation**: Each test should be independent
4. **Mock External Dependencies**: Mock databases, APIs, etc.
5. **Test Edge Cases**: Include boundary conditions and error cases

### Naming Conventions

- Test files: `*.test.js`
- Test suites: `describe('ComponentName', () => {})`
- Test cases: `it('should perform specific action', () => {})`
- Mock functions: `mockFunctionName`

### Performance Tips

1. **Use beforeEach/afterEach**: Clean up between tests
2. **Minimize Database Operations**: Use mocks when possible
3. **Parallel Execution**: Jest runs tests in parallel by default
4. **Test Timeouts**: Set appropriate timeouts for async operations

## 🤝 Contributing

When adding new features:

1. **Write Tests First**: Follow TDD when possible
2. **Maintain Coverage**: Keep coverage above thresholds
3. **Update Documentation**: Update this README if needed
4. **Run Full Suite**: Ensure all tests pass before submitting

## 📞 Support

For testing-related questions:
- Check Jest documentation: https://jestjs.io/docs/getting-started
- Review existing test examples in this codebase
- Run `node scripts/run-tests.js --help` for script options

---

**Note**: This testing framework is designed to grow with the application. As new features are added, corresponding tests should be created following the established patterns and conventions.
