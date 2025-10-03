// Check existing staff users in your WAMP database
const mysql = require("mysql2/promise");

async function checkStaffUsers() {
  try {
    const dbUrl = "mysql://root:@localhost:3306/dlc_ui";
    const connection = await mysql.createConnection(dbUrl);

    console.log("🔍 Checking staff_users table...\n");

    // Get all staff users
    const [users] = await connection.execute(
      "SELECT id, name, email, role, created_at FROM staff_users ORDER BY id"
    );

    if (users.length === 0) {
      console.log("❌ No staff users found in the database");
      console.log("💡 You need to create a staff user first");
    } else {
      console.log("👥 Found staff users:");
      console.log("ID | Name | Email | Role | Created");
      console.log("---|------|-------|------|--------");
      users.forEach((user) => {
        console.log(
          `${user.id} | ${user.name} | ${user.email} | ${user.role} | ${user.created_at}`
        );
      });
    }

    // Check if the specific email exists
    const [specificUser] = await connection.execute(
      "SELECT id, name, email, password_hash FROM staff_users WHERE email = ?",
      ["staff@bioUploader.com"]
    );

    console.log("\n🎯 Checking for 'staff@bioUploader.com':");
    if (specificUser.length === 0) {
      console.log("❌ Email 'staff@bioUploader.com' not found");
      console.log("💡 This email doesn't exist in your database");
    } else {
      console.log("✅ Email found!");
      console.log(
        "Password hash:",
        specificUser[0].password_hash ? "exists" : "missing"
      );
    }

    await connection.end();
  } catch (error) {
    console.error("❌ Error checking staff users:", error.message);
  }
}

checkStaffUsers();
