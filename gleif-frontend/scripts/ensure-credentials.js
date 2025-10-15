/* eslint-disable */
/// <reference types="node" />
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const publicKeriDir = path.join(
  __dirname,
  "..",
  "public",
  ".well-known",
  "keri"
);
const didConfigFile = path.join(
  __dirname,
  "..",
  "public",
  ".well-known",
  "did-configuration.json"
);
const saidFile = path.join(publicKeriDir, "credential-said.txt");
const icpDir = path.join(publicKeriDir, "icp");

function credentialsExist() {
  if (!fs.existsSync(saidFile) || !fs.existsSync(didConfigFile)) {
    return false;
  }

  // Check if ICP directory exists and has at least one file
  if (!fs.existsSync(icpDir)) {
    return false;
  }

  const icpFiles = fs.readdirSync(icpDir);
  return icpFiles.length > 0;
}

if (credentialsExist()) {
  console.log(
    "✅ Credential artifacts (KERI + DID Configuration) already exist. Skipping generation."
  );
  process.exit(0);
}

console.log("🔄 KERI credential files not found. Generating...");

// Change to did-management directory
process.chdir(path.join(__dirname, "..", "..", "did-management"));

// Install dependencies if needed
try {
  execSync("npm install", { stdio: "inherit" });
} catch (error) {
  console.error(
    "❌ Failed to install did-management dependencies:",
    error.message
  );
  process.exit(1);
}

// Generate DID
try {
  execSync("npm start", { stdio: "inherit" });
} catch (error) {
  console.error("❌ Failed to generate DID:", error.message);
  process.exit(1);
}

// Read the generated DID
const walletPath = path.join(process.cwd(), "twin-wallet.json");
if (!fs.existsSync(walletPath)) {
  console.error("❌ twin-wallet.json not found after DID generation");
  process.exit(1);
}

const wallet = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
const did = wallet.did;

// Make generate-credentials.sh executable and run it
const scriptPath = path.join(process.cwd(), "generate-credentials.sh");
try {
  execSync(`chmod +x ${scriptPath}`, { stdio: "inherit" });
  execSync(`${scriptPath} ${did}`, { stdio: "inherit" });
} catch (error) {
  console.error("❌ Failed to generate credentials:", error.message);
  process.exit(1);
}

console.log("✅ KERI credentials generated successfully.");
