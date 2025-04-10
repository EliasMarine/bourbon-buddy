const jwt = require('jsonwebtoken')
const fs = require('fs')
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

  // Print token without any formatting or line breaks
  process.stdout.write(token)
  
} catch (error) {
  console.error('\nError:', error.message)
  process.exit(1)
} 