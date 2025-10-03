// Check actual database schema for your existing tables
const mysql = require("mysql2/promise");

async function checkSchema() {
  try {
    const connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/dlc_ui"
    );

    console.log("🔍 Checking database schema...\n");

    // Check key tables structure
    const tables = [
      "dlc_lga",
      "dlc_state",
      "dlc_marital_status",
      "dlc_session",
      "dlc_course_of_study",
    ];

    for (const table of tables) {
      console.log(`📊 Table: ${table}`);
      try {
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        columns.forEach((col) => {
          console.log(
            `  - ${col.Field} (${col.Type}) ${
              col.Key ? "[" + col.Key + "]" : ""
            }`
          );
        });
        console.log("");
      } catch (e) {
        console.log(`  ❌ Error: ${e.message}\n`);
      }
    }

    // Check sample data from dlc_lga
    console.log("🔍 Sample LGA data:");
    try {
      const [lgas] = await connection.execute("SELECT * FROM dlc_lga LIMIT 5");
      console.log(lgas);
    } catch (e) {
      console.log(`❌ LGA query error: ${e.message}`);
    }

    // Check sample data from dlc_state
    console.log("\n🔍 Sample State data:");
    try {
      const [states] = await connection.execute(
        "SELECT * FROM dlc_state LIMIT 5"
      );
      console.log(states);
    } catch (e) {
      console.log(`❌ State query error: ${e.message}`);
    }

    await connection.end();
  } catch (error) {
    console.error("❌ Schema check failed:", error.message);
  }
}

checkSchema();
