// Test password verification for staff users
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function testPasswordVerification() {
  try {
    const dbUrl = "mysql://root:@localhost:3306/dlc_ui";
    const connection = await mysql.createConnection(dbUrl);

    const email = "staff@bioUploader.com";
    const testPassword = "admin123";

    console.log("🔐 Testing password verification...\n");

    // Get the user and password hash
    const [users] = await connection.execute(
      "SELECT id, name, email, password_hash FROM staff_users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      console.log("❌ User not found");
      return;
    }

    const user = users[0];
    console.log("👤 User found:");
    console.log("  ID:", user.id);
    console.log("  Name:", user.name);
    console.log("  Email:", user.email);
    console.log("  Password hash:", user.password_hash);
    console.log("  Hash length:", user.password_hash?.length || 0);

    // Test password verification
    console.log("\n🧪 Testing password verification:");
    console.log("  Test password:", testPassword);

    if (!user.password_hash) {
      console.log("❌ No password hash found");
      return;
    }

    try {
      const isValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log("  Password match:", isValid ? "✅ VALID" : "❌ INVALID");

      if (!isValid) {
        console.log("\n🔧 Creating new hash for 'admin123':");
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log("  New hash:", newHash);

        console.log("\n💡 To fix this, run this SQL command:");
        console.log(
          `UPDATE staff_users SET password_hash = '${newHash}' WHERE email = '${email}';`
        );
      }
    } catch (hashError) {
      console.log("❌ Error comparing password:", hashError.message);
      console.log("💡 The password hash might be in a different format");

      // Create a new proper hash
      console.log("\n🔧 Creating new bcrypt hash for 'admin123':");
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log("  New hash:", newHash);

      console.log("\n💡 To fix this, run this SQL command:");
      console.log(
        `UPDATE staff_users SET password_hash = '${newHash}' WHERE email = '${email}';`
      );
    }

    await connection.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testPasswordVerification();
