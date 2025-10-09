import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/database';

export async function GET() {
  try {
    // Test database connection
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        status: 'success',
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
}