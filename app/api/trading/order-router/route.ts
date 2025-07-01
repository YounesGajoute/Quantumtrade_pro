import { NextRequest, NextResponse } from 'next/server'
import { routeOrder, executeOrder, getRouterMetrics, getExchangeMetrics } from '@/lib/core/order-router'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const exchangeId = searchParams.get('exchangeId')
    
    switch (endpoint) {
      case 'metrics':
        const metrics = getRouterMetrics()
        return NextResponse.json({
          success: true,
          data: metrics,
          timestamp: Date.now()
        })
        
      case 'exchange-metrics':
        if (!exchangeId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Exchange ID is required',
              timestamp: Date.now()
            },
            { status: 400 }
          )
        }
        
        const exchangeMetrics = getExchangeMetrics(exchangeId)
        if (!exchangeMetrics) {
          return NextResponse.json(
            {
              success: false,
              error: 'Exchange not found',
              timestamp: Date.now()
            },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: exchangeMetrics,
          timestamp: Date.now()
        })
        
      default:
        // Return router overview
        const routerMetrics = getRouterMetrics()
        return NextResponse.json({
          success: true,
          data: {
            metrics: routerMetrics,
            status: 'operational'
          },
          timestamp: Date.now()
        })
    }
  } catch (error) {
    console.error('Order router API error:', error)
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
    const { action, orderRequest, routingDecision } = body
    
    switch (action) {
      case 'route':
        if (!orderRequest) {
          return NextResponse.json(
            {
              success: false,
              error: 'Order request is required',
              timestamp: Date.now()
            },
            { status: 400 }
          )
        }
        
        const decision = await routeOrder(orderRequest)
        return NextResponse.json({
          success: true,
          data: decision,
          timestamp: Date.now()
        })
        
      case 'execute':
        if (!orderRequest || !routingDecision) {
          return NextResponse.json(
            {
              success: false,
              error: 'Order request and routing decision are required',
              timestamp: Date.now()
            },
            { status: 400 }
          )
        }
        
        const response = await executeOrder(orderRequest, routingDecision)
        return NextResponse.json({
          success: true,
          data: response,
          timestamp: Date.now()
        })
        
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use "route" or "execute"',
            timestamp: Date.now()
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Order router execution error:', error)
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