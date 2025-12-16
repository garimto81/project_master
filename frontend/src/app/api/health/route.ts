/**
 * Health Check API
 * GET /api/health
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: '6.1.0',
    architecture: '2-tier',
    timestamp: new Date().toISOString(),
  })
}
