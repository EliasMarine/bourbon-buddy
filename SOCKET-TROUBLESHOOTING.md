# Socket.IO Troubleshooting Guide

This guide provides solutions for common issues with the WebSocket connections in the streaming module.

## Running the App Correctly

For the streaming module to work properly, you must run the application with Socket.IO support:

**Development:**
```bash
npm run dev:socket
```

**Production:**
```bash
npm run start
```

Using `npm run dev` without Socket.IO support will cause streaming and chat to fail.

## Testing Socket Connections

Visit `/test-socket` in your browser to test the Socket.IO connection. This page shows:
- Connection status
- Socket ID
- Events received from the server
- Functions to send test messages and ping the server

## Common Issues and Solutions

### 1. Socket Connection Errors

**Symptoms:**
- "Connection error" message
- Red connection indicator on the chat box
- Streams not initializing

**Solutions:**
- Verify the server is running with `npm run dev:socket`
- Check console logs for specific error messages
- Visit the `/test-socket` page to diagnose connection issues
- Ensure port 3000 is not blocked by firewall

### 2. Media Stream Access Issues

**Symptoms:**
- Camera/microphone not working
- Permission errors

**Solutions:**
- Check browser permissions for camera and microphone
- Ensure you're running in a secure context (HTTPS or localhost)
- Try a different browser (Chrome or Firefox recommended)
- Disconnect any virtual camera software that might interfere
- Close other applications that may be using the camera

### 3. WebRTC Connection Problems

**Symptoms:**
- Host can stream but viewers can't see it
- Black screen for viewers

**Solutions:**
- Check if the STUN servers are accessible (not blocked by firewall)
- Ensure both host and viewers are connected to the same Socket.IO server
- Try a different network if behind a restrictive firewall
- Use the test page to verify signaling works

### 4. Production Deployment Issues

When deploying to production:

1. Ensure the `start` script runs `server.js` (already configured)
2. Verify that WebSocket connections are allowed by your hosting provider
3. Update CORS settings in `server.js` if necessary for your production domain
4. Configure any reverse proxy (Nginx, etc.) to support WebSocket upgrades

## Debugging Tools

1. Browser Console: Check for JavaScript errors and Socket.IO connection messages
2. Network Tab: Look for WebSocket connections and any failed requests
3. Test Page: Use `/test-socket` to isolate Socket.IO issues
4. Server Logs: Check the terminal where `npm run dev:socket` is running

## Configuration Options

Socket.IO is configured in these files:
- `server.js` - Server-side Socket.IO configuration
- `StreamInitializer.tsx` - Client-side socket for streams
- `ChatBox.tsx` - Client-side socket for chat

If you need to customize connection parameters, edit these files. 