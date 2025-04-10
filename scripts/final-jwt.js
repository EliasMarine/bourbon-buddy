const jwt = require('jsonwebtoken')
const fs = require('fs')
require('dotenv').config()

// Read private key
const privateKey = fs.readFileSync('/Users/eliasbouzeid/Downloads/AuthKey_L22R6XQW86.p8', 'utf8')

// Fixed data
const header = {
  alg: 'ES256',
  kid: 'L22R6XQW86',
  typ: 'JWT'
}

const payload = {
  iss: '892353VN4Z',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60),
  aud: 'https://appleid.apple.com',
  sub: 'com.bitspec.bourbonbuddy'
}

// Manual base64url encode to ensure no line breaks
function base64urlEncode(obj) {
  const str = JSON.stringify(obj)
  const base64 = Buffer.from(str).toString('base64')
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Sign the JWT manually to ensure clean format
try {
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header,
    noTimestamp: true // Use our own timestamps
  })
  
  // Save the token to a file
  fs.writeFileSync('final-jwt.txt', token, 'utf8')
  
  console.log('JWT token created successfully!')
  console.log('\nToken:')
  console.log(token)
  console.log('\nSaved to final-jwt.txt')
  
  // Also copy to clipboard on Mac
  require('child_process').execSync(`echo "${token}" | pbcopy`)
  console.log('\nToken copied to clipboard!')
  
} catch (error) {
  console.error('Error generating JWT:', error.message)
} 