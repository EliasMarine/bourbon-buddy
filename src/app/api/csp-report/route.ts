import { NextRequest, NextResponse } from "next/server"

// In-memory store for CSP reports (for development purposes)
// In production, you would typically log these to a database or monitoring service
const CSP_REPORTS: any[] = []

/**
 * Handles CSP violation reports sent by browsers
 * Accepts both application/csp-report and application/json content types
 */
export async function POST(request: NextRequest) {
  try {
    // Check for valid content type
    const contentType = request.headers.get("content-type")
    if (contentType !== "application/csp-report" && contentType !== "application/json") {
      console.warn(`[CSP Report] Invalid content type: ${contentType}`)
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }

    // Parse the report data
    const rawBody = await request.json()
    
    // Extract the actual CSP report (browsers format this differently)
    const reportData = rawBody["csp-report"] || rawBody
    
    // Enrich the report with additional data
    const enrichedReport = {
      ...reportData,
      timestamp: new Date().toISOString(),
      ip: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      url: request.url,
    }
    
    // Add to in-memory store (only for development)
    CSP_REPORTS.push(enrichedReport)
    
    // Log to console for monitoring
    console.warn("[CSP REPORT]", JSON.stringify(enrichedReport, null, 2))
    
    // In production you might want to send this to your logging system
    // e.g., Sentry, LogRocket, etc.
    
    // Return a successful empty response (204 No Content)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("CSP report parsing error:", err)
    return new NextResponse(null, { status: 204 })
  }
}

/**
 * Provides a way to view recent CSP violations - FOR DEVELOPMENT USE ONLY
 * WARNING: In production, remove or protect this endpoint as it could expose sensitive information
 */
export async function GET() {
  // Return the most recent 100 reports
  return NextResponse.json({
    reports: CSP_REPORTS.slice(-100),
    count: CSP_REPORTS.length,
    message: "WARNING: This endpoint should be disabled or protected in production"
  })
} 