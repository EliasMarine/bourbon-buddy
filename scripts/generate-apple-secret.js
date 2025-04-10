const jwt = require('jsonwebtoken')
const fs = require('fs')
require('dotenv').config()

function validateEnvironment() {
  const requiredVars = [
    'APPLE_TEAM_ID',
    'APPLE_CLIENT_ID',
    'APPLE_KEY_ID',
    'APPLE_PRIVATE_KEY'
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0)
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

function getPrivateKey() {
  const privateKeyPath = process.env.APPLE_PRIVATE_KEY

  // Check if the value is a file path
  if (privateKeyPath.endsWith('.p8')) {
    try {
      return fs.readFileSync(privateKeyPath, 'utf8')
    } catch (error) {
      throw new Error(`Failed to read private key file: ${error.message}`)
    }
  }

  // Otherwise, assume it's the key content
  return privateKeyPath.replace(/\\n/g, '\n')
}

function generateSecret() {
  validateEnvironment()

  const privateKey = getPrivateKey()
  const teamId = process.env.APPLE_TEAM_ID
  const clientId = process.env.APPLE_CLIENT_ID
  const keyId = process.env.APPLE_KEY_ID

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

    // Ensure there are no line breaks in the token
    const cleanToken = token.replace(/\r?\n|\r/g, '')
    
    const expirationDate = new Date(expirationTime * 1000).toLocaleString()
    console.log('\nGenerated client secret:')
    console.log('------------------------')
    console.log(cleanToken)
    console.log('\nExpires on:', expirationDate)
    console.log('\nMake sure to update your client secret before it expires!')

    // Also save to a file for easy copy/paste
    fs.writeFileSync('apple-client-secret.txt', cleanToken, 'utf8')
    console.log('\nThe secret has also been saved to apple-client-secret.txt')

    return cleanToken
  } catch (error) {
    throw new Error(`Failed to generate client secret: ${error.message}`)
  }
}

try {
  generateSecret()
} catch (error) {
  console.error('\nError:', error.message)
  process.exit(1)
}
