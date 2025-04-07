# Security Features

This document outlines the security features implemented in the application, particularly focusing on protection against common attack vectors.

## Account Lockout System

The application implements a comprehensive account lockout system to protect against password cracking attempts.

### How It Works

1. **Failed Login Tracking**
   - The system tracks failed login attempts by email address
   - After 5 failed attempts within a 60-minute window, the account is locked
   - Locked accounts cannot be used for login for 15 minutes

2. **IP-Based Protection**
   - The system also tracks login attempts by IP address
   - If 10 or more failed attempts from different accounts are detected from the same IP,
     the IP is temporarily blocked

3. **Security Logging**
   - All login attempts (successful and failed) are logged
   - Account lockouts and suspicious activities generate security alerts
   - Critical security events are logged to separate files

### User Experience

When a user's account is locked:
- They will see a clear message explaining that too many failed attempts have occurred
- The message will indicate how much time remains before they can try again
- They have the option to reset their password to unlock the account immediately

## CSRF Protection

The application implements Cross-Site Request Forgery (CSRF) protection:

1. **Token-Based Protection**
   - CSRF tokens are generated for all state-changing forms
   - Tokens have expiration times and are validated on submission

2. **Cookie Security**
   - Uses HttpOnly, Secure, and SameSite=Strict cookies
   - Cookie values are cryptographically signed

## File Upload Security

For file uploads, the application implements:

1. **File Validation**
   - Strict MIME type and file extension validation
   - File content validation to verify file types
   - Randomized filenames to prevent path traversal attacks

2. **Size Limiting**
   - Maximum file size limitations
   - Reasonable limits for different file types

## Input Validation

All user input is validated:

1. **Form Validation**
   - Client-side validation for immediate feedback
   - Server-side validation for security
   - Schema-based validation using Zod

2. **Data Sanitization**
   - All user input is sanitized before processing
   - Prevents XSS and injection attacks

## Security Headers

The application sets the following security headers:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; [additional directives]
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Error Handling

1. **Safe Error Messages**
   - Generic error messages that don't leak sensitive information
   - Detailed errors are logged but not displayed to users

2. **Consistent Handling**
   - Unified error handling approach
   - Structured logging for troubleshooting

## Rate Limiting

The application implements rate limiting on sensitive endpoints:

1. **Authentication Endpoints**
   - Login: 5 attempts per 15 minutes
   - Registration: 3 attempts per hour
   - Password Reset: 3 attempts per hour

2. **API Endpoints**
   - General API: 100 requests per 15 minutes
   - File Uploads: 20 uploads per hour

## Deployment Security

1. **Environment Verification**
   - Security checks run at application startup
   - Production deployments have additional security checks
   - Test endpoints and tools are automatically detected and reported if deployed to production

2. **Secrets Management**
   - Environment variables for sensitive configuration
   - No hardcoded secrets in the codebase

## Security Maintenance

1. **Regular Updates**
   - Dependencies are regularly updated
   - Security patches are applied promptly

2. **Monitoring**
   - Security events are logged and monitored
   - Suspicious activity generates alerts 