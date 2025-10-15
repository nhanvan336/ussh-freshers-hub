#!/usr/bin/env node

/**
 * USSH Freshers' Hub - Setup Verification Script
 * Verifies that all necessary files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath} - MISSING`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()) {
    log(`✅ ${description}: ${dirPath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${dirPath} - MISSING`, 'red');
    return false;
  }
}

async function verifySetup() {
  log('🔍 USSH Freshers\' Hub - Setup Verification', 'blue');
  log('=' .repeat(50), 'blue');
  
  let allGood = true;
  
  // Core application files
  log('\n📦 Core Application Files:', 'blue');
  allGood &= checkFile('server.js', 'Main server file');
  allGood &= checkFile('package.json', 'Package configuration');
  
  // Environment files
  log('\n⚙️ Environment Configuration:', 'blue');
  allGood &= checkFile('.env.example', 'Environment template');
  allGood &= checkFile('.env.development', 'Development environment');
  allGood &= checkFile('.env.production', 'Production environment');
  
  // Docker files
  log('\n🐳 Docker Configuration:', 'blue');
  allGood &= checkFile('Dockerfile', 'Docker container definition');
  allGood &= checkFile('docker-compose.yml', 'Development orchestration');
  allGood &= checkFile('docker-compose.prod.yml', 'Production orchestration');
  allGood &= checkFile('.dockerignore', 'Docker ignore file');
  
  // Configuration directories
  log('\n📁 Configuration Directories:', 'blue');
  allGood &= checkDirectory('config', 'Application config');
  allGood &= checkDirectory('controllers', 'Controllers');
  allGood &= checkDirectory('models', 'Data models');
  allGood &= checkDirectory('routes', 'Route definitions');
  allGood &= checkDirectory('routes/api', 'API routes');
  allGood &= checkDirectory('middleware', 'Middleware');
  allGood &= checkDirectory('services', 'Business services');
  allGood &= checkDirectory('views', 'View templates');
  allGood &= checkDirectory('public', 'Static assets');
  
  // Test files
  log('\n🧪 Testing Infrastructure:', 'blue');
  allGood &= checkFile('jest.config.js', 'Jest configuration');
  allGood &= checkDirectory('tests', 'Test directory');
  allGood &= checkFile('tests/setup.js', 'Test setup');
  
  // Production directories
  log('\n🏗️ Production Directories:', 'blue');
  allGood &= checkDirectory('logs', 'Logs directory');
  allGood &= checkDirectory('uploads', 'Uploads directory');
  allGood &= checkDirectory('ssl', 'SSL certificates directory');
  allGood &= checkDirectory('backups', 'Backups directory');
  allGood &= checkDirectory('nginx', 'Nginx configuration');
  allGood &= checkDirectory('scripts/production', 'Production scripts');
  
  // Production files
  log('\n🚀 Production Files:', 'blue');
  allGood &= checkFile('nginx/nginx.conf', 'Nginx dev config');
  allGood &= checkFile('nginx/nginx.prod.conf', 'Nginx prod config');
  allGood &= checkFile('nginx/conf.d/app.conf', 'App server config');
  allGood &= checkFile('redis/redis.conf', 'Redis configuration');
  allGood &= checkFile('scripts/mongo-init.js', 'MongoDB init script');
  allGood &= checkFile('scripts/production/deploy.sh', 'Deployment script');
  allGood &= checkFile('scripts/production/backup.sh', 'Backup script');
  allGood &= checkFile('scripts/production/monitor.sh', 'Monitoring script');
  allGood &= checkFile('scripts/production/setup.sh', 'Setup script');
  
  // Node modules
  log('\n📚 Dependencies:', 'blue');
  allGood &= checkDirectory('node_modules', 'Node.js dependencies');
  
  // Test imports
  log('\n🔗 Import Testing:', 'blue');
  try {
    require('../config/database.js');
    log('✅ Database config import', 'green');
  } catch (error) {
    log(`❌ Database config import: ${error.message}`, 'red');
    allGood = false;
  }
  
  try {
    require('../config/passport.js');
    log('✅ Passport config import', 'green');
  } catch (error) {
    log(`❌ Passport config import: ${error.message}`, 'red');
    allGood = false;
  }
  
  try {
    require('../models/User.js');
    log('✅ User model import', 'green');
  } catch (error) {
    log(`❌ User model import: ${error.message}`, 'red');
    allGood = false;
  }
  
  // Final result
  log('\n' + '=' .repeat(50), 'blue');
  if (allGood) {
    log('🎉 ALL CHECKS PASSED! Application is ready to run.', 'green');
    log('\n📋 Next steps:', 'blue');
    log('1. Development: npm run dev', 'yellow');
    log('2. Testing: npm test', 'yellow');
    log('3. Production: ./scripts/production/deploy.sh', 'yellow');
  } else {
    log('⚠️ Some issues found. Please fix the missing files above.', 'red');
  }
  log('=' .repeat(50), 'blue');
  
  return allGood;
}

// Run verification
if (require.main === module) {
  verifySetup().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log(`❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = verifySetup;
