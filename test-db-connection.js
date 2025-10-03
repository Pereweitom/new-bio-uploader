// Test database connection script
require("dotenv").config({ path: ".env.local" });
const mysql = require("mysql2/promise");

function parseDatabaseUrl(url) {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port) || 3306,
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1),
  };
}

async function testConnection() {
  const isProduction = process.env.NODE_ENV === "production";
  const databaseUrl = isProduction
    ? process.env.DATABASE_URL_LIVE
    : process.env.DATABASE_URL_LOCAL;

  console.log("=== Database Connection Test ===");
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Using: ${isProduction ? "LIVE" : "LOCAL"} database`);
  console.log(`Database URL: ${databaseUrl}`);

  const config = parseDatabaseUrl(databaseUrl);
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`User: ${config.user}`);
  console.log(`Database: ${config.database}`);
  console.log("Password: [HIDDEN]");

  try {
    // Direct connection to WAMP database
    const dbUrl =
      "mysql://webmaster:IsaSamLelSam2024.@3.211.213.139:3306/dlc_ui";

    console.log("🔌 Testing connection to:", dbUrl.replace(/:[^:]*@/, ":***@"));

    const connection = await mysql.createConnection(dbUrl);

    // Test basic connection
    console.log("✅ Database connected successfully!");

    // Check if required tables exist
    const [tables] = await connection.execute("SHOW TABLES");
    const tableNames = tables.map((row) => Object.values(row)[0]);

    console.log("\n📊 Tables found in database:");
    tableNames.forEach((table) => console.log(`  - ${table}`));

    // Check required tables
    const requiredTables = [
      "dlc_student",
      "dlc_student_id",
      "dlc_marital_status",
      "dlc_session",
      "dlc_course_of_study",
      "dlc_state",
      "dlc_lga",
      "staff_users",
    ];

    console.log("\n🔍 Required tables check:");
    requiredTables.forEach((table) => {
      const exists = tableNames.includes(table);
      console.log(`  ${exists ? "✅" : "❌"} ${table}`);
    });

    // Check staff users
    try {
      const [users] = await connection.execute(
        "SELECT COUNT(*) as count FROM staff_users"
      );
      console.log(`\n👥 Staff users found: ${users[0].count}`);
    } catch (e) {
      console.log("\n❌ staff_users table not found or empty");
    }

    await connection.end();
    console.log("\n🎉 Connection test completed!");
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error("Error:", error.message);
    console.error("\n💡 Common fixes:");
    console.error("  1. Make sure WAMP is running");
    console.error("  2. Check database name in .env.local");
    console.error("  3. Verify MySQL service is started");
  }
}

// Run the test
testConnection();
