import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password required for debug'
      }, { status: 400 });
    }

    // Step 1: Check if user exists
    const query = 'SELECT id, email, name, password_hash, role, active FROM staff_users WHERE email = ?';
    const users = await executeQuery<any>(query, [email.toLowerCase().trim()]);
    
    const debug: any = {
      step1_user_found: users.length > 0,
      step2_user_data: users.length > 0 ? {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        role: users[0].role,
        active: users[0].active,
        password_hash_length: users[0].password_hash?.length || 0,
        password_hash_starts_with: users[0].password_hash?.substring(0, 10) || 'none'
      } : null,
      step3_input_email: email.toLowerCase().trim(),
      step4_input_password_length: password.length,
      step5_environment: {
        jwt_secret_exists: !!process.env.JWT_SECRET,
        jwt_secret_length: process.env.JWT_SECRET?.length || 0,
        node_env: process.env.NODE_ENV
      }
    };

    if (users.length === 0) {
      return NextResponse.json({
        debug,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Step 6: Check if user is active
    if (user.active !== 1) {
      debug.step6_user_active = false;
      return NextResponse.json({
        debug,
        message: 'User is not active'
      });
    }

    debug.step6_user_active = true;

    // Step 7: Test password verification
    try {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      debug.step7_password_match = isValidPassword;
      
      // Also test against the known hash for "admin123"
      const testHash = '$2b$10$rOzJrVkjJz5VfGzLvW9Zn.XJYGKzLrQrJ5VfGzLvW9Zn.XJYGKzLr';
      const testAgainstKnownHash = await bcrypt.compare(password, testHash);
      debug.step7_test_against_sample_hash = testAgainstKnownHash;
      
    } catch (error) {
      debug.step7_password_error = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      debug,
      message: 'Debug complete - check all steps'
    });

  } catch (error) {
    console.error('Debug login error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}