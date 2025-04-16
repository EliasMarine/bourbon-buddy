// Verify Sentry source maps integration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Sentry source maps integration...');

// 1. Check if Sentry plugin is properly configured in next.config.js
console.log('Checking next.config.js...');
try {
  const nextConfig = fs.readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf8');
  if (!nextConfig.includes('withSentryConfig')) {
    console.error('❌ Sentry plugin is not properly configured in next.config.js');
    process.exit(1);
  }
  
  if (!nextConfig.includes('injectDebugIds: true')) {
    console.warn('⚠️ Debug ID injection might not be enabled in next.config.js');
  }
  
  console.log('✅ Sentry plugin is properly configured in next.config.js');
} catch (error) {
  console.error('❌ Error reading next.config.js:', error.message);
  process.exit(1);
}

// 2. Check if Sentry auth token is present
console.log('Checking Sentry auth token...');
const envFiles = ['.env', '.env.local', '.env.production', '.env.sentry-build-plugin'];
let tokenFound = false;

for (const envFile of envFiles) {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), envFile), 'utf8');
    if (envContent.includes('SENTRY_AUTH_TOKEN=')) {
      console.log(`✅ Found Sentry auth token in ${envFile}`);
      tokenFound = true;
      break;
    }
  } catch (error) {
    // Skip if file doesn't exist
  }
}

if (!tokenFound) {
  console.error('❌ Sentry auth token not found in any environment file');
  console.error('Please set SENTRY_AUTH_TOKEN in one of your .env files');
  process.exit(1);
}

// 3. Check if Sentry package is installed
console.log('Checking Sentry package installation...');
try {
  const packageJson = require(path.join(process.cwd(), 'package.json'));
  if (!packageJson.dependencies['@sentry/nextjs']) {
    console.error('❌ @sentry/nextjs is not installed');
    process.exit(1);
  }
  console.log(`✅ @sentry/nextjs is installed (version ${packageJson.dependencies['@sentry/nextjs']})`);
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// 4. Check if source maps files exist after build
console.log('Checking for source maps in .next directory...');
exec('find .next -name "*.js.map" | head -n 3', (error, stdout) => {
  if (error) {
    console.error('❌ Error searching for source maps:', error.message);
    return;
  }
  
  if (!stdout.trim()) {
    console.warn('⚠️ No source maps found in .next directory. Did you run next build?');
  } else {
    console.log('✅ Source maps found in .next directory:');
    console.log(stdout);
  }
  
  console.log('\n🧠 RECOMMENDED STEPS TO FIX SOURCE MAPS ISSUES:');
  console.log('1. Make sure your next.config.js has injectDebugIds: true');
  console.log('2. Use the SAME build for both uploading to Sentry and deploying');
  console.log('3. Set SENTRY_AUTH_TOKEN in your deployment environment');
  console.log('4. After fixing, run a complete fresh build and deployment');
}); 