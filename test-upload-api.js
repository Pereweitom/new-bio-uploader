// Test the upload API directly to see where it fails
const FormData = require("form-data");
const fs = require("fs");
const fetch = require("node-fetch");

async function testUploadAPI() {
  try {
    console.log("🧪 Testing upload API...");

    // Create form data
    const form = new FormData();
    const csvContent = fs.readFileSync("test-small.csv");
    form.append("csvFile", csvContent, "test-small.csv");
    form.append("dryRun", "true");
    form.append("batchSize", "5");

    // Make request (you'll need to get the actual auth token)
    console.log("📤 Making upload request...");
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: form,
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE", // Replace with actual token
        ...form.getHeaders(),
      },
    });

    console.log("📨 Response status:", response.status);
    const result = await response.json();
    console.log("📄 Response body:", result);
  } catch (error) {
    console.error("❌ Upload API test failed:", error.message);
  }
}

console.log("⚠️  To test upload API, you need to:");
console.log("1. Get auth token from browser localStorage");
console.log("2. Replace YOUR_TOKEN_HERE in this script");
console.log("3. Run: node test-upload-api.js");
