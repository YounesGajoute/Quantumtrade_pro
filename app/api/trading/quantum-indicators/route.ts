import { NextRequest, NextResponse } from 'next/server'
import quantumIndicatorEngine from '@/lib/core/quantum-indicator-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get('symbols')?.split(',') || []
    const limit = parseInt(searchParams.get('limit') || '10')
    
    console.log(`Quantum Indicators API: Processing ${symbols.length} symbols`)
    
    if (symbols.length === 0) {
      // Generate sample symbols for demonstration
      const sampleSymbols = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
        'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'AVAXUSDT', 'UNIUSDT',
        'ATOMUSDT', 'LTCUSDT', 'XRPUSDT', 'BCHUSDT', 'FILUSDT',
        'NEARUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT', 'FTMUSDT'
      ]
      
      const rankedSymbols = await quantumIndicatorEngine.processSymbolUniverse(sampleSymbols)
      
      return NextResponse.json({
        success: true,
        data: {
          indicators: rankedSymbols.slice(0, limit),
          metrics: quantumIndicatorEngine.getMetrics(),
          timestamp: Date.now(),
          totalProcessed: rankedSymbols.length
        },
        message: 'Quantum indicators processed successfully'
      })
    }
    
    // Process requested symbols
    const rankedSymbols = await quantumIndicatorEngine.processSymbolUniverse(symbols)
    
    return NextResponse.json({
      success: true,
      data: {
        indicators: rankedSymbols.slice(0, limit),
        metrics: quantumIndicatorEngine.getMetrics(),
        timestamp: Date.now(),
        totalProcessed: rankedSymbols.length
      },
      message: 'Quantum indicators processed successfully'
    })
    
  } catch (error) {
    console.error('Quantum Indicators API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process quantum indicators',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols = [], limit = 10, filters = {} } = body
    
    console.log(`Quantum Indicators POST: Processing ${symbols.length} symbols with filters`)
    
    if (symbols.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No symbols provided'
      }, { status: 400 })
    }
    
    // Process symbols with quantum engine
    const rankedSymbols = await quantumIndicatorEngine.processSymbolUniverse(symbols)
    
    // Apply additional filters if provided
    let filteredSymbols = rankedSymbols
    
    if (filters.minScore) {
      filteredSymbols = filteredSymbols.filter(s => s.score >= filters.minScore)
    }
    
    if (filters.signalType) {
      filteredSymbols = filteredSymbols.filter(s => s.signals.primary === filters.signalType)
    }
    
    if (filters.minConfidence) {
      filteredSymbols = filteredSymbols.filter(s => s.signals.confidence >= filters.minConfidence)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        indicators: filteredSymbols.slice(0, limit),
        metrics: quantumIndicatorEngine.getMetrics(),
        timestamp: Date.now(),
        totalProcessed: rankedSymbols.length,
        filteredCount: filteredSymbols.length
      },
      message: 'Quantum indicators processed with filters'
    })
    
  } catch (error) {
    console.error('Quantum Indicators POST Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process quantum indicators',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 