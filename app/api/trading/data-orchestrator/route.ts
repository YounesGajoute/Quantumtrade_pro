import { NextRequest, NextResponse } from 'next/server'
import { 
  startDataFlow, 
  getMarketData, 
  getSymbolData, 
  getDataFlowMetrics, 
  getMarketRegime,
  startContinuousUpdates,
  stopContinuousUpdates
} from '@/lib/core/data-orchestrator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const symbol = searchParams.get('symbol')
    const symbols = searchParams.get('symbols')?.split(',')
    
    switch (endpoint) {
      case 'market-data':
        const marketData = getMarketData(symbols)
        return NextResponse.json({
          success: true,
          data: marketData,
          count: marketData.length,
          timestamp: Date.now()
        })
        
      case 'symbol-data':
        if (!symbol) {
          return NextResponse.json(
            {
              success: false,
              error: 'Symbol parameter is required',
              timestamp: Date.now()
            },
            { status: 400 }
          )
        }
        
        const symbolData = getSymbolData(symbol)
        if (!symbolData) {
          return NextResponse.json(
            {
              success: false,
              error: 'Symbol data not found',
              timestamp: Date.now()
            },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: symbolData,
          timestamp: Date.now()
        })
        
      case 'metrics':
        const metrics = getDataFlowMetrics()
        return NextResponse.json({
          success: true,
          data: metrics,
          timestamp: Date.now()
        })
        
      case 'market-regime':
        const regime = getMarketRegime()
        return NextResponse.json({
          success: true,
          data: regime,
          timestamp: Date.now()
        })
        
      default:
        // Return orchestrator overview
        const orchestratorMetrics = getDataFlowMetrics()
        const marketRegime = getMarketRegime()
        const sampleData = getMarketData(symbols?.slice(0, 5))
        
        return NextResponse.json({
          success: true,
          data: {
            metrics: orchestratorMetrics,
            regime: marketRegime,
            sampleData,
            status: 'operational'
          },
          timestamp: Date.now()
        })
    }
  } catch (error) {
    console.error('Data orchestrator API error:', error)
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
    const { action, symbols } = body
    
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
    
    switch (action) {
      case 'start-flow':
        await startDataFlow(symbols)
        return NextResponse.json({
          success: true,
          message: `Data flow started for ${symbols.length} symbols`,
          timestamp: Date.now()
        })
        
      case 'start-continuous':
        startContinuousUpdates(symbols)
        return NextResponse.json({
          success: true,
          message: `Continuous updates started for ${symbols.length} symbols`,
          timestamp: Date.now()
        })
        
      case 'stop-continuous':
        stopContinuousUpdates()
        return NextResponse.json({
          success: true,
          message: 'Continuous updates stopped',
          timestamp: Date.now()
        })
        
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use "start-flow", "start-continuous", or "stop-continuous"',
            timestamp: Date.now()
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Data orchestrator execution error:', error)
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