import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { executeQuery } from '@/lib/database';

export async function POST() {
  try {
    // Check if any staff users exist
    const existingUsers = await executeQuery(
      'SELECT COUNT(*) as count FROM staff_users'
    );
    
    const userCount = (existingUsers[0] as any).count;
    
    if (userCount > 0) {
      return NextResponse.json({
        status: 'info',
        message: 'Staff users already exist',
        count: userCount
      });
    }

    // Create default admin and staff users
    const defaultUsers = [
      {
        email: 'admin@bioUploader.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      {
        email: 'staff@bioUploader.com', 
        password: 'admin123',
        firstName: 'Staff',
        lastName: 'User',
        role: 'staff'
      }
    ];

    let createdCount = 0;
    for (const user of defaultUsers) {
      const hashedPassword = await AuthService.hashPassword(user.password);
      
      await executeQuery(
        `INSERT INTO staff_users (name, email, password_hash, role, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [`${user.firstName} ${user.lastName}`, user.email, hashedPassword, user.role]
      );
      
      createdCount++;
    }

    return NextResponse.json({
      status: 'success',
      message: `Created ${createdCount} default staff users`,
      users: defaultUsers.map(u => ({ email: u.email, role: u.role })),
      note: 'Please change these passwords immediately in production!'
    });

  } catch (error) {
    console.error('Setup users error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to create users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}