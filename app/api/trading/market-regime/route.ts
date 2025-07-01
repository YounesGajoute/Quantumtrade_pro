import { NextRequest, NextResponse } from 'next/server'
import { getCurrentRegime, getRegimeConfidence, getRegimeMetrics } from '@/lib/core/market-regime-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    
    switch (endpoint) {
      case 'current-regime':
        const regime = getCurrentRegime()
        return NextResponse.json({
          success: true,
          data: regime,
          timestamp: Date.now()
        })
        
      case 'regime-confidence':
        const confidence = getRegimeConfidence()
        return NextResponse.json({
          success: true,
          data: { confidence },
          timestamp: Date.now()
        })
        
      case 'metrics':
        const metrics = getRegimeMetrics()
        return NextResponse.json({
          success: true,
          data: metrics,
          timestamp: Date.now()
        })
        
      default:
        // Return all regime data
        const currentRegime = getCurrentRegime()
        const regimeConfidence = getRegimeConfidence()
        const regimeMetrics = getRegimeMetrics()
        
        return NextResponse.json({
          success: true,
          data: {
            regime: currentRegime,
            confidence: regimeConfidence,
            metrics: regimeMetrics
          },
          timestamp: Date.now()
        })
    }
  } catch (error) {
    console.error('Market regime API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols } = body
    
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbols array is required',
          timestamp: Date.now()
        },
        { status: 400 }
      )
    }
    
    // Import the detection function dynamically to avoid circular dependencies
    const { detectMarketRegime } = await import('@/lib/core/market-regime-engine')
    const regime = await detectMarketRegime(symbols)
    
    return NextResponse.json({
      success: true,
      data: regime,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Market regime detection error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
} 