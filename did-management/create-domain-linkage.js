import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";

async function main() {
  const [domainOrigin, outputPath] = process.argv.slice(2);

  if (!domainOrigin) {
    throw new Error(
      "Usage: node create-domain-linkage.js <domainOrigin> [outputPath]"
    );
  }

  const resolvedOutputPath =
    outputPath || "../gleif-frontend/public/.well-known/did-configuration.json";

  // Get the directory where this script is located
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const walletPath = `${__dirname}/twin-wallet.json`;

  const walletRaw = await readFile(walletPath, "utf-8");
  const wallet = JSON.parse(walletRaw);

  if (!wallet.controllerIdentity || !wallet.verificationMethodId) {
    throw new Error(
      "Wallet missing controllerIdentity or verificationMethodId. Run manage-did.js first."
    );
  }

  const response = await fetch("http://localhost:3001/domain-credential", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      controllerIdentity: wallet.controllerIdentity,
      verificationMethodId: wallet.verificationMethodId,
      domainOrigin,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to generate domain linkage credential: HTTP ${
        response.status
      } ${await response.text()}`
    );
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(
      result.error || "Domain linkage credential generation failed"
    );
  }

  const config = {
    "@context": "https://identity.foundation/.well-known/did-configuration/v1",
    linked_dids: [result.jwt],
  };

  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, JSON.stringify(config, null, 2));

  console.log(`✅ Domain linkage configuration saved to ${resolvedOutputPath}`);
}

main().catch((error) => {
  console.error("❌", error.message);
  process.exit(1);
});
