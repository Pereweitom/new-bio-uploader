import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Get all staff users (without passwords)
    const users = await executeQuery(
      'SELECT id, name, email, role, created_at FROM staff_users ORDER BY created_at DESC'
    );

    // Count users by role
    const roleCount = await executeQuery(
      'SELECT role, COUNT(*) as count FROM staff_users GROUP BY role'
    );

    return NextResponse.json({
      status: 'success',
      users: users,
      summary: {
        total: users.length,
        byRole: roleCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}