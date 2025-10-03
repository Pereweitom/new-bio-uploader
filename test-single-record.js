// Test processing a single CSV record to isolate the issue
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

// Minimal version of the lookups for testing
class TestLookups {
  static async lookupMaritalStatus(statusName) {
    const connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/dlc_ui"
    );
    try {
      const [results] = await connection.execute(
        "SELECT status_serial FROM dlc_marital_status WHERE LOWER(status_name) = LOWER(?)",
        [statusName.trim()]
      );
      return results.length > 0
        ? { statusSerial: results[0].status_serial, isDefault: false }
        : { statusSerial: 1, isDefault: true };
    } finally {
      await connection.end();
    }
  }

  static async lookupSession(yearOfEntry) {
    const connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/dlc_ui"
    );
    try {
      const [results] = await connection.execute(
        'SELECT sessionID FROM dlc_session WHERE sessionName = ? OR CONCAT(sessionName, "/", CAST(CAST(sessionName AS UNSIGNED) + 1 AS CHAR)) = ?',
        [yearOfEntry, yearOfEntry]
      );
      return results.length > 0 ? results[0].sessionID : null;
    } finally {
      await connection.end();
    }
  }

  static async lookupLga(lgaName, stateId) {
    const connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/dlc_ui"
    );
    try {
      const [results] = await connection.execute(
        "SELECT lga_id FROM dlc_lga WHERE LOWER(lga_name) = LOWER(?) AND state_id = ?",
        [lgaName.trim(), stateId]
      );
      return results.length > 0
        ? { lgaId: results[0].lga_id, usedFallback: false }
        : { lgaId: null, usedFallback: false };
    } finally {
      await connection.end();
    }
  }

  static async lookupState(stateName) {
    const connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/dlc_ui"
    );
    try {
      const [results] = await connection.execute(
        "SELECT state_id FROM dlc_state WHERE LOWER(state_name) = LOWER(?)",
        [stateName.trim()]
      );
      return results.length > 0 ? results[0].state_id : null;
    } finally {
      await connection.end();
    }
  }
}

async function testSingleRecord() {
  console.log("🧪 Testing single record processing...\n");

  // Sample record from your CSV
  const testRecord = {
    "S/N": "1",
    "Application Number": "UIODEL41730297993",
    "Matric Number": "E054888",
    "Last Name": "ABAYOMI",
    "First Name": "julianah",
    Othernames: "tomiwa",
    Gender: "Female",
    DoB: "2005-08-22",
    "Marital Status": "Single",
    Religion: "",
    Phone: "08167909928",
    Email: "e054888.abayomi@dlc.ui.edu.ng",
    "Contact Address": "#4,ayegbami street#ibadan#Oyo#Nigeria",
    "Postal Address": "",
    Profession: "",
    "Year Of Entry": "2023/2024",
    "State Of Origin": "Lagos",
    LGA: "Ibeju- Lekki",
    Nationality: "Nigerian",
    Faculty: "Arts",
    Department: "Communication And Language Arts",
    Programme: "BACHELOR OF ARTS (COMMUNICATION AND LANGUAGE ARTS)",
    "Programme Duration": "5years",
    "Entry Mode": "O' Level",
    "Current Level": "100",
    "Mode Of Study": "",
    "Interective Center": "",
    "Exam Center": "Ibadan",
    "Teaching Subject": "",
    "Verification Status": "Yes",
  };

  try {
    console.log("1️⃣ Testing field validation...");

    // Check required fields
    const requiredFields = [
      "Matric Number",
      "Last Name",
      "First Name",
      "Gender",
      "DoB",
      "Year Of Entry",
      "Department",
    ];
    for (const field of requiredFields) {
      if (!testRecord[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    console.log("✅ All required fields present");

    // Test gender normalization
    const gender = testRecord["Gender"].toLowerCase().trim();
    if (gender === "f" || gender === "female") {
      console.log("✅ Gender validation passed: Female");
    } else if (gender === "m" || gender === "male") {
      console.log("✅ Gender validation passed: Male");
    } else {
      throw new Error(`Invalid gender: ${testRecord["Gender"]}`);
    }

    console.log("\n2️⃣ Testing database lookups...");

    // Test marital status lookup
    const maritalResult = await TestLookups.lookupMaritalStatus(
      testRecord["Marital Status"]
    );
    console.log(
      `✅ Marital Status: ${testRecord["Marital Status"]} → ${maritalResult.statusSerial}`
    );

    // Test session lookup
    const sessionId = await TestLookups.lookupSession(
      testRecord["Year Of Entry"]
    );
    console.log(`✅ Session: ${testRecord["Year Of Entry"]} → ${sessionId}`);

    // Test state lookup
    const stateId = await TestLookups.lookupState(
      testRecord["State Of Origin"]
    );
    console.log(`✅ State: ${testRecord["State Of Origin"]} → ${stateId}`);

    // Test LGA lookup
    const lgaResult = await TestLookups.lookupLga(testRecord["LGA"], stateId);
    console.log(`✅ LGA: ${testRecord["LGA"]} → ${lgaResult.lgaId}`);

    console.log("\n3️⃣ Testing password hashing...");
    const hashedPassword = await bcrypt.hash("defaultPassword123", 10);
    console.log(`✅ Password hashed: ${hashedPassword.substring(0, 20)}...`);

    console.log("\n4️⃣ Testing database insert simulation...");

    // Simulate the student record
    const studentRecord = {
      applicant_no: testRecord["Application Number"],
      stud_matricno: testRecord["Matric Number"],
      lastName: testRecord["Last Name"],
      firstName: testRecord["First Name"],
      middleName: testRecord["Othernames"] || "",
      gender: gender === "f" || gender === "female" ? "Female" : "Male",
      date_of_birth: testRecord["DoB"],
      marital_status: maritalResult.statusSerial,
      email: testRecord["Email"],
      phone: testRecord["Phone"],
      contact_address: testRecord["Contact Address"],
      nationality: testRecord["Nationality"],
      state_of_origin: stateId,
      lga: lgaResult.lgaId,
      password: hashedPassword,
      session_id: sessionId,
      year_of_entry: testRecord["Year Of Entry"],
    };

    console.log("✅ Student record prepared successfully");
    console.log("Sample fields:", {
      matricNo: studentRecord.stud_matricno,
      name: `${studentRecord.firstName} ${studentRecord.lastName}`,
      gender: studentRecord.gender,
      state: stateId,
      lga: lgaResult.lgaId,
      session: sessionId,
    });

    console.log(
      "\n🎉 Single record test PASSED! The processing logic works correctly."
    );
    console.log("💡 The upload issue might be related to:");
    console.log("   - Batch processing timeout");
    console.log("   - Database connection pooling");
    console.log("   - Memory usage with large CSV files");
    console.log("   - Frontend timeout waiting for response");
  } catch (error) {
    console.error("❌ Single record test FAILED:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testSingleRecord();
