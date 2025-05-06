import { createSafeActionClient } from "next-safe-action";

// Define a base error class if needed, or use standard Error
export class ProfileActionError extends Error {
  constructor(message: string = "An error occurred") {
    super(message);
    this.name = "ProfileActionError";
  }
}

// Create the safe action client with basic server error handling
export const action = createSafeActionClient({
  handleServerError(error: Error) {
    // Log the full error for server-side debugging
    console.error("Safe Action Server Error:", error);

    // Return a generic or specific message based on the error type
    if (error instanceof ProfileActionError) {
      return error.message;
    } else {
      return "An unexpected server error occurred."; // Generic default message
    }
  },
  // Middleware removed - will handle auth context within actions
}); 