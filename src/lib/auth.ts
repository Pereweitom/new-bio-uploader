import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { executeQuery } from './database';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'staff' | 'admin';
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  private static readonly TOKEN_EXPIRY = '24h';

  /**
   * Authenticate user with email and password
   */
  static async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Query user from database (adjust table name as needed)
      const query = 'SELECT id, email, name, password_hash, role FROM staff_users WHERE email = ? AND active = 1';
      const users = await executeQuery<any>(query, [email.toLowerCase().trim()]);

      if (users.length === 0) {
        return { success: false, message: 'Invalid email or password' };
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(tokenPayload, this.JWT_SECRET, { 
        expiresIn: this.TOKEN_EXPIRY 
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Verify JWT token and return user info
   */
  static async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Optionally re-query user to ensure they're still active
      const query = 'SELECT id, email, name, role FROM staff_users WHERE id = ? AND active = 1';
      const users = await executeQuery<any>(query, [decoded.id]);
      
      if (users.length === 0) {
        return null;
      }

      return {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        role: users[0].role
      };
    } catch {
      return null;
    }
  }

  /**
   * Hash password for storage
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.SALT_ROUNDS || '10');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Create a new staff user (for admin use)
   */
  static async createUser(email: string, password: string, name: string, role: 'staff' | 'admin' = 'staff'): Promise<boolean> {
    try {
      const hashedPassword = await this.hashPassword(password);
      
      const query = `
        INSERT INTO staff_users (email, password_hash, name, role, active, created_at)
        VALUES (?, ?, ?, ?, 1, NOW())
      `;
      
      await executeQuery(query, [email.toLowerCase().trim(), hashedPassword, name.trim(), role]);
      return true;
    } catch (error) {
      console.error('User creation error:', error);
      return false;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

/**
 * Middleware to protect API routes for Next.js App Router
 */
export function withAuth(handler: (req: any, user: User) => Promise<any>) {
  return async (req: any) => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = AuthService.extractTokenFromHeader(authHeader);
      
      if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const user = await AuthService.verifyToken(token);
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Call the protected handler with user info
      return handler(req, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}