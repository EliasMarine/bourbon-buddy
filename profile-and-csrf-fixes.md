# Profile Display and CSRF Upload Issues - Technical Documentation

## Issues Addressed

1. **User Profile Display Issues**
   - User name displayed as "User" instead of actual name
   - Profile pictures not properly linked between auth and database

2. **Profile Photo Upload Failures**
   - CSRF token validation causing 403 errors
   - Upload API failures with 500 Internal Server errors

## Root Causes

1. **Profile Display Issues**
   - Supabase Auth metadata and User database table were out of sync
   - The sync-user API wasn't properly updating both the database and auth metadata
   - When updating user data, existing values might be overwritten with empty values

2. **Upload API Issues**
   - CSRF validation logic didn't properly bypass checks in development mode
   - The upload API was using inconsistent bucket names
   - Profile image upload API was using JSON data instead of multipart/form-data
   - Error handling was incomplete in upload API endpoints

## Applied Fixes

### 1. Profile Display Sync Improvements

1. **src/app/api/auth/sync-user/route.ts**
   - Modified the user data merging logic to preserve existing values when new values are empty
   - Added proper user data fetching after updates to ensure consistent state
   - Updated auth metadata to include the final username, name, and avatar data
   - Improved error handling and error messages

2. **src/app/api/user/upload-image/route.ts**
   - Completely rewrote the endpoint to handle direct file uploads rather than just URLs
   - Added proper metadata synchronization between Auth and Database
   - Improved error handling and logging
   - Uses the admin client to update auth metadata to ensure sync succeeds

### 2. CSRF Validation Fixes

1. **src/app/api/upload/route.ts**
   - Fixed CSRF validation bypass logic to properly work in development mode
   - Used consistent bucket name across the application
   - Added detailed logging for debugging upload issues
   - Improved error handling and error messages
   - Enhanced file validation

2. **src/lib/csrf.ts**
   - Fixed the validateCsrfToken function to reliably bypass CSRF in development or when bypass flag is set
   - Improved logging for CSRF-related decisions

## Impact of Changes

These changes ensure:

1. User profile data (name, username, avatar) properly syncs between Supabase Auth and the User database table
2. Profile image uploads work consistently, especially in development mode
3. Improved error handling throughout the authentication and upload processes
4. Better logging for debugging future issues

## Testing

To test these changes:

1. Log in and verify your profile displays the correct name
2. Upload a profile picture and verify it appears correctly
3. Ensure the name and profile picture persist across refreshes and re-logins

## Deployment Notes

These changes maintain backward compatibility with existing data and should be deployed without requiring any database migrations or special procedures. 