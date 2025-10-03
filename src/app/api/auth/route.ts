import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await AuthService.login(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Login failed' },
        { status: 401 }
      );
    }

    // Return success with token and user info
    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}