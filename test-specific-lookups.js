// Test specific lookup values from the CSV
const mysql = require("mysql2/promise");

async function testLookups() {
  try {
    const connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/dlc_ui"
    );

    console.log("🔍 Testing specific lookups from CSV...\n");

    // Test State lookup
    console.log('🏢 Testing State: "Lagos"');
    const [states] = await connection.execute(
      "SELECT state_id, state_name FROM dlc_state WHERE LOWER(state_name) = LOWER(?)",
      ["Lagos"]
    );
    console.log("Result:", states);

    // Test LGA lookup (the problematic one)
    console.log('\n🏛️ Testing LGA: "Ibeju- Lekki"');
    const [lgas1] = await connection.execute(
      "SELECT lga_id, lga_name, state_id FROM dlc_lga WHERE LOWER(lga_name) = LOWER(?)",
      ["Ibeju- Lekki"]
    );
    console.log("Exact match result:", lgas1);

    // Try variations
    console.log("\n🔍 Trying LGA variations:");
    const variations = [
      "Ibeju-Lekki",
      "Ibeju Lekki",
      "IBEJU-LEKKI",
      "ibeju lekki",
    ];

    for (const variation of variations) {
      const [results] = await connection.execute(
        "SELECT lga_id, lga_name, state_id FROM dlc_lga WHERE LOWER(lga_name) = LOWER(?)",
        [variation]
      );
      console.log(`  "${variation}": ${results.length} match(es)`);
      if (results.length > 0) console.log("    Found:", results[0]);
    }

    // Search for Lagos LGAs
    console.log('\n🔍 All Lagos LGAs containing "Ibeju":');
    const lagosStateId = states.length > 0 ? states[0].state_id : null;
    if (lagosStateId) {
      const [lagosLgas] = await connection.execute(
        "SELECT lga_id, lga_name FROM dlc_lga WHERE state_id = ? AND LOWER(lga_name) LIKE LOWER(?)",
        [lagosStateId, "%ibeju%"]
      );
      console.log("Results:", lagosLgas);
    }

    // Test Marital Status
    console.log('\n💑 Testing Marital Status: "Single"');
    const [marital] = await connection.execute(
      "SELECT status_serial, status_name FROM dlc_marital_status WHERE LOWER(status_name) = LOWER(?)",
      ["Single"]
    );
    console.log("Result:", marital);

    // Test Session
    console.log('\n📅 Testing Session: "2023/2024"');
    const [sessions] = await connection.execute(
      'SELECT sessionID, sessionName FROM dlc_session WHERE sessionName = ? OR CONCAT(sessionName, "/", CAST(CAST(sessionName AS UNSIGNED) + 1 AS CHAR)) = ?',
      ["2023/2024", "2023/2024"]
    );
    console.log("Result:", sessions);

    await connection.end();
  } catch (error) {
    console.error("❌ Lookup test failed:", error.message);
  }
}

testLookups();
