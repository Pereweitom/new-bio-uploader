// Fix staff user passwords in your WAMP database
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function fixStaffPasswords() {
  try {
    const dbUrl =
      "mysql://webmaster:IsaSamLelSam2024.@3.211.213.139:3306/dlc_ui";
    const connection = await mysql.createConnection(dbUrl);

    console.log("🔧 Fixing staff user passwords...\n");

    // Create proper hash for 'admin123'
    const password = "admin123";
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log("🔐 Generated password hash for 'admin123'");
    console.log("Hash:", passwordHash);

    // Update both admin and staff users
    const users = [
      { email: "admin@bioUploader.com", role: "admin" },
      { email: "staff@bioUploader.com", role: "staff" },
    ];

    for (const user of users) {
      const [result] = await connection.execute(
        "UPDATE staff_users SET password_hash = ? WHERE email = ?",
        [passwordHash, user.email]
      );

      if (result.affectedRows > 0) {
        console.log(`✅ Updated password for ${user.email} (${user.role})`);
      } else {
        console.log(`❌ Failed to update ${user.email} - user not found`);
      }
    }

    // Verify the updates
    console.log("\n🔍 Verifying password updates:");
    for (const user of users) {
      const [userRecord] = await connection.execute(
        "SELECT email, password_hash FROM staff_users WHERE email = ?",
        [user.email]
      );

      if (userRecord.length > 0) {
        const isValid = await bcrypt.compare(
          password,
          userRecord[0].password_hash
        );
        console.log(
          `${user.email}: ${
            isValid ? "✅ Password verified" : "❌ Password verification failed"
          }`
        );
      }
    }

    await connection.end();

    console.log("\n🎉 Password fix completed!");
    console.log("📝 You can now login with:");
    console.log("   Email: admin@bioUploader.com or staff@bioUploader.com");
    console.log("   Password: admin123");
  } catch (error) {
    console.error("❌ Error fixing passwords:", error.message);
  }
}

fixStaffPasswords();
