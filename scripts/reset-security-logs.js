#!/usr/bin/env node

/**
 * Security Log Reset Script
 * 
 * This script clears test security logs and resets security data.
 * It should be run before deploying to production or after testing.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Since our project might be using ESM modules, we'll directly work with the log files
// instead of importing the code modules

console.log('🧹 Bourbon Buddy Security Log Cleanup Utility');
console.log('=============================================\n');

// Check environment
const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env.toUpperCase()} environment`);

if (env === 'production') {
  console.error('⛔ This script should not be run in production environment!');
  console.error('If you need to reset security data in production, use the admin API endpoint with proper authorization.');
  process.exit(1);
}

// Clear security logs
try {
  console.log('\n📝 Clearing security logs...');
  
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('   Created logs directory.');
  }
  
  const securityLog = path.join(logsDir, 'security.log');
  const criticalLog = path.join(logsDir, 'critical-security.log');
  
  // Clear the log files
  if (fs.existsSync(securityLog)) {
    fs.writeFileSync(securityLog, '', 'utf8');
    console.log('   ✅ Cleared security.log');
  } else {
    fs.writeFileSync(securityLog, '', 'utf8');
    console.log('   ✅ Created empty security.log');
  }
  
  if (fs.existsSync(criticalLog)) {
    fs.writeFileSync(criticalLog, '', 'utf8');
    console.log('   ✅ Cleared critical-security.log');
  } else {
    fs.writeFileSync(criticalLog, '', 'utf8');
    console.log('   ✅ Created empty critical-security.log');
  }
  
  // Add initial log entry
  const timestamp = new Date().toISOString();
  const initialLogEntry = JSON.stringify({
    timestamp,
    type: 'security_logs_reset',
    severity: 'medium',
    userId: 'system',
    details: { action: 'Log files reset by admin script' },
    environment: env
  });
  
  fs.appendFileSync(securityLog, initialLogEntry + '\n', 'utf8');
  console.log('✅ Security logs reset successfully.');
} catch (error) {
  console.error('❌ Failed to clear security logs:', error);
}

// List all logs in the directory
const logsDir = path.join(process.cwd(), 'logs');
if (fs.existsSync(logsDir)) {
  console.log('\n📁 Current log files:');
  const logFiles = fs.readdirSync(logsDir);
  
  if (logFiles.length === 0) {
    console.log('   No log files found.');
  } else {
    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  }
} else {
  console.log('\n📁 No logs directory found.');
}

console.log('\n✨ Cleanup complete!');
console.log('\nℹ️ Note: In-memory security tracking data will be reset when the server restarts.');
console.log('   To reset it immediately, restart your application server.'); 