import { NextRequest, NextResponse } from "next/server"

// In-memory store for CSP reports (for dev only)
const CSP_REPORTS: any[] = []

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type")
    if (contentType !== "application/csp-report" && contentType !== "application/json") {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }
    const body = await request.json()
    CSP_REPORTS.push({
      ...body,
      timestamp: new Date().toISOString(),
      ip: request.headers.get("x-forwarded-for") || "unknown"
    })
    // Log to console (or forward to Sentry, etc.)
    console.warn("[CSP REPORT]", JSON.stringify(body, null, 2))
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("CSP report error:", err)
    return new NextResponse(null, { status: 204 })
  }
}

// WARNING: Do not expose in production!
export async function GET() {
  return NextResponse.json(CSP_REPORTS.slice(-100))
} 