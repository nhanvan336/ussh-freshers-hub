#!/usr/bin/env node

/**
 * USSH Freshers' Hub - Import Check Script
 * Checks all imports to identify missing functions/modules
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

async function checkImports() {
  log('🔍 Checking all imports...', 'blue');
  
  const errors = [];
  
  // Routes to check
  const routes = [
    'routes/index.js',
    'routes/auth.js', 
    'routes/forum.js',
    'routes/learning-hub.js',
    'routes/wellness.js',
    'routes/handbook.js',
    'routes/api.js'
  ];
  
  for (const routeFile of routes) {
    try {
      log(`Checking ${routeFile}...`, 'blue');
      require(`../${routeFile}`);
      log(`✅ ${routeFile}`, 'green');
    } catch (error) {
      log(`❌ ${routeFile}: ${error.message}`, 'red');
      errors.push({ file: routeFile, error: error.message });
    }
  }
  
  // API routes
  const apiRoutes = [
    'routes/api/auth.js',
    'routes/api/forum.js',
    'routes/api/learning.js',
    'routes/api/wellness.js',
    'routes/api/documents.js',
    'routes/api/notifications.js',
    'routes/api/chatbot.js'
  ];
  
  for (const apiRoute of apiRoutes) {
    try {
      log(`Checking ${apiRoute}...`, 'blue');
      require(`../${apiRoute}`);
      log(`✅ ${apiRoute}`, 'green');
    } catch (error) {
      log(`❌ ${apiRoute}: ${error.message}`, 'red');
      errors.push({ file: apiRoute, error: error.message });
    }
  }
  
  if (errors.length === 0) {
    log('🎉 All imports are working!', 'green');
  } else {
    log(`⚠️ Found ${errors.length} import errors:`, 'yellow');
    errors.forEach(({file, error}) => {
      log(`  ${file}: ${error}`, 'red');
    });
  }
  
  return errors.length === 0;
}

// Run check
if (require.main === module) {
  checkImports().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log(`❌ Check failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = checkImports;
