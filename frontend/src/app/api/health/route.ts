/**
 * Health Check API
 * GET /api/health
 */

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "6.2.0",
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
    architecture: "2-tier",
    timestamp: new Date().toISOString(),
  })
}
