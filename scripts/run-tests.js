#!/usr/bin/env node

/**
 * Comprehensive Test Runner Script
 * Provides detailed test execution with coverage reports and performance metrics
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      unit: null,
      integration: null,
      overall: null
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '..'),
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (options.showOutput) {
          process.stdout.write(data);
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (options.showOutput) {
          process.stderr.write(data);
        }
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', reject);
    });
  }

  parseJestOutput(output) {
    const lines = output.split('\n');
    const results = {
      testSuites: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      coverage: null,
      duration: null
    };

    for (const line of lines) {
      // Parse test results
      if (line.includes('Test Suites:')) {
        const match = line.match(/Test Suites: (\d+) passed, (\d+) total/);
        if (match) {
          results.testSuites = parseInt(match[2]);
        }
      }
      
      if (line.includes('Tests:')) {
        const match = line.match(/Tests:\s+(\d+) passed, (\d+) total/);
        if (match) {
          results.passed = parseInt(match[1]);
          results.tests = parseInt(match[2]);
          results.failed = results.tests - results.passed;
        }
      }

      // Parse duration
      if (line.includes('Time:')) {
        const match = line.match(/Time:\s+([0-9.]+)\s*s/);
        if (match) {
          results.duration = parseFloat(match[1]);
        }
      }

      // Parse coverage
      if (line.includes('All files')) {
        const match = line.match(/All files\s+\|\s+([0-9.]+)\s+\|\s+([0-9.]+)\s+\|\s+([0-9.]+)\s+\|\s+([0-9.]+)/);
        if (match) {
          results.coverage = {
            statements: parseFloat(match[1]),
            branches: parseFloat(match[2]),
            functions: parseFloat(match[3]),
            lines: parseFloat(match[4])
          };
        }
      }
    }

    return results;
  }

  async runUnitTests() {
    this.log('🧪 Running Unit Tests', 'info');
    
    const result = await this.runCommand('npm', ['run', 'test:unit'], {
      showOutput: true
    });

    this.results.unit = this.parseJestOutput(result.stdout);
    
    if (result.success) {
      this.log('✅ Unit tests completed successfully', 'success');
    } else {
      this.log('❌ Unit tests failed', 'error');
    }

    return result;
  }

  async runIntegrationTests() {
    this.log('🔗 Running Integration Tests', 'info');
    
    const result = await this.runCommand('npm', ['run', 'test:integration'], {
      showOutput: true
    });

    this.results.integration = this.parseJestOutput(result.stdout);
    
    if (result.success) {
      this.log('✅ Integration tests completed successfully', 'success');
    } else {
      this.log('❌ Integration tests failed', 'error');
    }

    return result;
  }

  async runCoverageReport() {
    this.log('📊 Generating Coverage Report', 'info');
    
    const result = await this.runCommand('npm', ['run', 'test:coverage'], {
      showOutput: false
    });

    this.results.overall = this.parseJestOutput(result.stdout);
    
    if (result.success) {
      this.log('✅ Coverage report generated successfully', 'success');
    } else {
      this.log('❌ Coverage report generation failed', 'error');
    }

    return result;
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = (endTime - this.startTime) / 1000;

    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST EXECUTION REPORT');
    console.log('='.repeat(80));
    
    console.log(`🕐 Total Execution Time: ${totalDuration.toFixed(2)} seconds`);
    console.log(`📅 Executed At: ${new Date().toISOString()}`);
    
    if (this.results.unit) {
      console.log('\n📝 UNIT TESTS:');
      console.log(`   Test Suites: ${this.results.unit.testSuites}`);
      console.log(`   Tests: ${this.results.unit.tests}`);
      console.log(`   Passed: ${this.results.unit.passed}`);
      console.log(`   Failed: ${this.results.unit.failed}`);
      if (this.results.unit.duration) {
        console.log(`   Duration: ${this.results.unit.duration}s`);
      }
    }

    if (this.results.integration) {
      console.log('\n🔗 INTEGRATION TESTS:');
      console.log(`   Test Suites: ${this.results.integration.testSuites}`);
      console.log(`   Tests: ${this.results.integration.tests}`);
      console.log(`   Passed: ${this.results.integration.passed}`);
      console.log(`   Failed: ${this.results.integration.failed}`);
      if (this.results.integration.duration) {
        console.log(`   Duration: ${this.results.integration.duration}s`);
      }
    }

    if (this.results.overall && this.results.overall.coverage) {
      console.log('\n📊 OVERALL COVERAGE:');
      console.log(`   Statements: ${this.results.overall.coverage.statements}%`);
      console.log(`   Branches: ${this.results.overall.coverage.branches}%`);
      console.log(`   Functions: ${this.results.overall.coverage.functions}%`);
      console.log(`   Lines: ${this.results.overall.coverage.lines}%`);
    }

    // Calculate overall statistics
    const totalTests = (this.results.unit?.tests || 0) + (this.results.integration?.tests || 0);
    const totalPassed = (this.results.unit?.passed || 0) + (this.results.integration?.passed || 0);
    const totalFailed = (this.results.unit?.failed || 0) + (this.results.integration?.failed || 0);
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0;

    console.log('\n🎯 SUMMARY:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Total Passed: ${totalPassed}`);
    console.log(`   Total Failed: ${totalFailed}`);
    console.log(`   Success Rate: ${successRate}%`);

    // Overall status
    const overallSuccess = totalFailed === 0 && totalTests > 0;
    console.log(`\n${overallSuccess ? '🎉' : '💥'} OVERALL STATUS: ${overallSuccess ? 'PASSED' : 'FAILED'}`);

    console.log('\n' + '='.repeat(80));

    return overallSuccess;
  }

  async checkEnvironment() {
    this.log('🔍 Checking test environment', 'info');
    
    // Check if test dependencies are available
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.log('❌ package.json not found', 'error');
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDevDeps = ['jest', 'supertest', 'mongodb-memory-server'];
    
    for (const dep of requiredDevDeps) {
      if (!packageJson.devDependencies || !packageJson.devDependencies[dep]) {
        this.log(`❌ Missing test dependency: ${dep}`, 'error');
        return false;
      }
    }

    this.log('✅ Test environment ready', 'success');
    return true;
  }

  async run() {
    try {
      this.log('🚀 Starting comprehensive test execution', 'info');
      
      // Check environment
      const envReady = await this.checkEnvironment();
      if (!envReady) {
        this.log('❌ Environment check failed. Please install dependencies first.', 'error');
        process.exit(1);
      }

      // Run tests
      const unitResult = await this.runUnitTests();
      console.log('\n' + '-'.repeat(40) + '\n');
      
      const integrationResult = await this.runIntegrationTests();
      console.log('\n' + '-'.repeat(40) + '\n');
      
      await this.runCoverageReport();
      
      // Generate final report
      const success = this.generateReport();
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      this.log(`💥 Test execution failed: ${error.message}`, 'error');
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
📚 USSH Freshers Hub - Test Runner

Usage: node scripts/run-tests.js [options]

Options:
  --help, -h     Show this help message
  --unit         Run only unit tests
  --integration  Run only integration tests
  --coverage     Run tests with coverage report
  --watch        Run tests in watch mode

Examples:
  node scripts/run-tests.js                    # Run all tests
  node scripts/run-tests.js --unit            # Run only unit tests
  node scripts/run-tests.js --integration     # Run only integration tests
  node scripts/run-tests.js --coverage        # Run with coverage
`);
    process.exit(0);
  }

  const runner = new TestRunner();
  
  if (args.includes('--unit')) {
    runner.runUnitTests().then(() => process.exit(0)).catch(() => process.exit(1));
  } else if (args.includes('--integration')) {
    runner.runIntegrationTests().then(() => process.exit(0)).catch(() => process.exit(1));
  } else if (args.includes('--coverage')) {
    runner.runCoverageReport().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    runner.run();
  }
}

module.exports = TestRunner;
