import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    // Set context to help identify this specific test
    Sentry.setTag('test_type', 'api_test');
    Sentry.setContext('test_info', {
      timestamp: new Date().toISOString(),
      source: 'test-sentry API route'
    });
    
    // Force an error
    throw new Error('This is a test error from the test-sentry API route');
  } catch (error) {
    // Explicitly capture the error
    Sentry.captureException(error);
    
    // Return an error response
    return new Response(JSON.stringify({ 
      message: 'Error triggered and sent to Sentry',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 