#!/usr/bin/env node

/**
 * Test Validation Script
 * Validates that the testing environment is properly configured
 */

const fs = require('fs');
const path = require('path');

class TestValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  addResult(message, type) {
    switch (type) {
      case 'error':
        this.errors.push(message);
        break;
      case 'warning':
        this.warnings.push(message);
        break;
      case 'success':
        this.success.push(message);
        break;
    }
  }

  validateFileExists(filePath, description) {
    const fullPath = path.resolve(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      this.addResult(`✅ ${description} exists: ${filePath}`, 'success');
      return true;
    } else {
      this.addResult(`❌ ${description} missing: ${filePath}`, 'error');
      return false;
    }
  }

  validateDirectoryStructure() {
    this.log('🔍 Validating test directory structure...', 'info');
    
    const requiredDirs = [
      'tests',
      'tests/controllers',
      'tests/middleware',
      'tests/models',
      'tests/integration'
    ];

    for (const dir of requiredDirs) {
      this.validateFileExists(dir, `Directory`);
    }
  }

  validateTestFiles() {
    this.log('📝 Validating test files...', 'info');
    
    const requiredFiles = [
      'tests/setup.js',
      'tests/controllers/authController.test.js',
      'tests/middleware/auth.test.js',
      'tests/middleware/errorHandler.test.js',
      'tests/models/User.test.js',
      'tests/integration/auth.integration.test.js'
    ];

    for (const file of requiredFiles) {
      this.validateFileExists(file, `Test file`);
    }
  }

  validateConfigFiles() {
    this.log('⚙️ Validating configuration files...', 'info');
    
    const configFiles = [
      'jest.config.js',
      'package.json'
    ];

    for (const file of configFiles) {
      this.validateFileExists(file, `Config file`);
    }
  }

  validatePackageJsonScripts() {
    this.log('📦 Validating package.json scripts...', 'info');
    
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredScripts = [
        'test',
        'test:watch',
        'test:coverage',
        'test:unit',
        'test:integration',
        'test:auth',
        'test:ci'
      ];

      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addResult(`✅ NPM script exists: ${script}`, 'success');
        } else {
          this.addResult(`❌ NPM script missing: ${script}`, 'error');
        }
      }
    }
  }

  validateDependencies() {
    this.log('📚 Validating test dependencies...', 'info');
    
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredDevDeps = [
        'jest',
        'supertest',
        'mongodb-memory-server'
      ];

      for (const dep of requiredDevDeps) {
        if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
          this.addResult(`✅ Dev dependency exists: ${dep}`, 'success');
        } else {
          this.addResult(`❌ Dev dependency missing: ${dep}`, 'error');
        }
      }

      // Check for required main dependencies
      const requiredDeps = [
        'mongoose',
        'bcryptjs',
        'jsonwebtoken',
        'express'
      ];

      for (const dep of requiredDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.addResult(`✅ Dependency exists: ${dep}`, 'success');
        } else {
          this.addResult(`❌ Dependency missing: ${dep}`, 'error');
        }
      }
    }
  }

  validateJestConfig() {
    this.log('🃏 Validating Jest configuration...', 'info');
    
    const jestConfigPath = path.resolve(__dirname, '..', 'jest.config.js');
    if (fs.existsSync(jestConfigPath)) {
      try {
        const jestConfig = require(jestConfigPath);
        
        const requiredConfigs = [
          'testEnvironment',
          'setupFilesAfterEnv',
          'testMatch',
          'collectCoverageFrom'
        ];

        for (const config of requiredConfigs) {
          if (jestConfig[config]) {
            this.addResult(`✅ Jest config has: ${config}`, 'success');
          } else {
            this.addResult(`⚠️ Jest config missing: ${config}`, 'warning');
          }
        }

        // Validate specific configurations
        if (jestConfig.testEnvironment === 'node') {
          this.addResult(`✅ Test environment set to 'node'`, 'success');
        } else {
          this.addResult(`⚠️ Test environment should be 'node' for backend testing`, 'warning');
        }

      } catch (error) {
        this.addResult(`❌ Jest config file has syntax errors: ${error.message}`, 'error');
      }
    }
  }

  validateTestContent() {
    this.log('🔬 Validating test file content...', 'info');
    
    const testFiles = [
      {
        path: 'tests/setup.js',
        checks: [
          'MongoMemoryServer',
          'beforeAll',
          'afterAll',
          'global.testUtils'
        ]
      },
      {
        path: 'tests/controllers/authController.test.js',
        checks: [
          'describe(',
          'it(',
          'expect(',
          'authController'
        ]
      }
    ];

    for (const testFile of testFiles) {
      const filePath = path.resolve(__dirname, '..', testFile.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const check of testFile.checks) {
          if (content.includes(check)) {
            this.addResult(`✅ ${testFile.path} contains: ${check}`, 'success');
          } else {
            this.addResult(`⚠️ ${testFile.path} missing: ${check}`, 'warning');
          }
        }
      }
    }
  }

  validateSourceFiles() {
    this.log('📄 Validating source files exist for testing...', 'info');
    
    const sourceFiles = [
      'controllers/authController.js',
      'middleware/auth.js',
      'middleware/errorHandler.js',
      'models/User.js'
    ];

    for (const file of sourceFiles) {
      this.validateFileExists(file, `Source file`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST VALIDATION REPORT');
    console.log('='.repeat(60));

    if (this.success.length > 0) {
      console.log('\n✅ SUCCESSFUL VALIDATIONS:');
      this.success.forEach(msg => console.log(`   ${msg}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach(msg => console.log(`   ${msg}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(msg => console.log(`   ${msg}`));
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Successful: ${this.success.length}`);
    console.log(`   ⚠️ Warnings: ${this.warnings.length}`);
    console.log(`   ❌ Errors: ${this.errors.length}`);

    const isValid = this.errors.length === 0;
    console.log(`\n🎯 VALIDATION STATUS: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);

    if (!isValid) {
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Fix all errors listed above');
      console.log('   2. Run: npm install (to install missing dependencies)');
      console.log('   3. Re-run this validation: node scripts/validate-tests.js');
      console.log('   4. Run tests: npm test');
    } else {
      console.log('\n🎉 Your testing environment is ready!');
      console.log('   Run tests with: npm test');
      console.log('   Run comprehensive tests: node scripts/run-tests.js');
    }

    console.log('='.repeat(60));
    return isValid;
  }

  async run() {
    try {
      this.log('🚀 Starting test environment validation...', 'info');
      
      this.validateDirectoryStructure();
      this.validateTestFiles();
      this.validateConfigFiles();
      this.validatePackageJsonScripts();
      this.validateDependencies();
      this.validateJestConfig();
      this.validateTestContent();
      this.validateSourceFiles();
      
      const isValid = this.generateReport();
      process.exit(isValid ? 0 : 1);
      
    } catch (error) {
      this.log(`💥 Validation failed: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Test Environment Validator

Usage: node scripts/validate-tests.js [options]

Options:
  --help, -h     Show this help message

This script validates that your testing environment is properly configured
by checking for required files, dependencies, and configurations.

Examples:
  node scripts/validate-tests.js          # Run full validation
`);
    process.exit(0);
  }

  const validator = new TestValidator();
  validator.run();
}

module.exports = TestValidator;
