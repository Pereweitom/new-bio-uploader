import mysql from 'mysql2/promise';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Parse DATABASE_URL into config object
function parseDatabaseUrl(url: string): DatabaseConfig {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port) || 3306,
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1), // remove leading slash
  };
}

// Get database configuration based on environment
function getDatabaseConfig(): DatabaseConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = isProduction 
    ? process.env.DATABASE_URL_LIVE 
    : process.env.DATABASE_URL_LOCAL;

  if (!databaseUrl) {
    throw new Error('Database URL not configured');
  }

  return parseDatabaseUrl(databaseUrl);
}

// Create connection pool
const config = getDatabaseConfig();
export const db = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Prepared statement helpers
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  try {
    const [rows] = await db.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
}

export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}