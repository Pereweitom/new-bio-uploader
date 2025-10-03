// Debug the CSV processing issue by testing with a small sample
const Papa = require("papaparse");
const fs = require("fs");

async function debugCsv() {
  try {
    console.log("🔍 Debugging CSV processing...\n");

    // Read the CSV file
    const csvContent = fs.readFileSync(
      "uploads/1759407554522_TESTBIODATA.csv",
      "utf8"
    );

    // Parse with Papa Parse
    console.log("📊 Parsing CSV...");
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
    });

    console.log(`✅ Parsed ${parseResult.data.length} rows`);
    console.log(`📋 Headers found:`, parseResult.meta.fields);

    // Check first row
    if (parseResult.data.length > 0) {
      console.log("\n🔍 First row data:");
      const firstRow = parseResult.data[0];
      Object.keys(firstRow).forEach((key) => {
        console.log(`  ${key}: "${firstRow[key]}"`);
      });

      // Check specific fields that might cause issues
      console.log("\n🧪 Field validation:");
      console.log(
        `  Gender: "${firstRow["Gender"]}" (${typeof firstRow["Gender"]})`
      );
      console.log(`  DoB: "${firstRow["DoB"]}" (${typeof firstRow["DoB"]})`);
      console.log(
        `  State Of Origin: "${firstRow["State Of Origin"]}" (${typeof firstRow[
          "State Of Origin"
        ]})`
      );
      console.log(`  LGA: "${firstRow["LGA"]}" (${typeof firstRow["LGA"]})`);
    }

    if (parseResult.errors.length > 0) {
      console.log("\n❌ Parse errors:");
      parseResult.errors.forEach((error) => {
        console.log(`  Row ${error.row}: ${error.message}`);
      });
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
  }
}

debugCsv();
