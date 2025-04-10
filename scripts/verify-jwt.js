const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Read private key directly
const privateKey = fs.readFileSync('/Users/eliasbouzeid/Downloads/AuthKey_L22R6XQW86.p8', 'utf8')
const teamId = '892353VN4Z'
const clientId = 'com.bitspec.bourbonbuddy'
const keyId = 'L22R6XQW86'

// Token valid for 180 days
const expirationTime = Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60)

const claims = {
  iss: teamId,
  iat: Math.floor(Date.now() / 1000),
  exp: expirationTime,
  aud: 'https://appleid.apple.com',
  sub: clientId
}

try {
  // Sign the JWT
  const token = jwt.sign(claims, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: keyId,
      typ: 'JWT'
    }
  })
  
  // Check that token has 3 parts separated by dots (header.payload.signature)
  const parts = token.split('.')
  if (parts.length !== 3) {
    console.error('Invalid JWT format: token should have 3 parts separated by dots')
    process.exit(1)
  }
  
  // Check that there are no line breaks
  if (token.includes('\n') || token.includes('\r')) {
    console.error('Warning: JWT contains line breaks')
  }
  
  // Log token information
  console.log('Valid JWT generated with:')
  console.log(`- Header: ${parts[0]}`)
  console.log(`- Payload: ${parts[1]}`)
  console.log(`- Signature: ${parts[2]}`)
  console.log('\nFull token:')
  console.log(token)
  
  // Save to file without any formatting
  fs.writeFileSync('clean-jwt.txt', token, 'utf8')
  console.log('\nToken saved to clean-jwt.txt')
  
} catch (error) {
  console.error('\nError:', error.message)
  process.exit(1)
} 