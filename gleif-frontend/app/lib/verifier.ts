// We will replace this with an import from the TWIN SDK
// import { DltService } from '@twin.org/dlt';

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function verifyLinkage(iotaDid: string) {
  console.log(`[Verifier] Starting LIVE verification for: ${iotaDid}`);

  try {
    // Validate DID format
    if (!iotaDid.startsWith("did:iota:")) {
      return {
        status: "NOT VERIFIED",
        reason:
          "Invalid DID format. Please provide a valid IOTA DID starting with 'did:iota:'.",
      };
    }

    // Step 1: Resolve the LIVE IOTA DID from the DLT
    console.log("[Verifier] Resolving TWIN ID from the DLT...");

    // Resolve the DID using the TWIN service
    const resolveResponse = await fetch(
      `${BACKEND_URL}/resolve-did/${encodeURIComponent(iotaDid)}`
    );
    if (!resolveResponse.ok) {
      if (resolveResponse.status === 500) {
        return {
          status: "NOT VERIFIED",
          reason:
            "DID not found on the IOTA network. Please ensure the DID exists and try again.",
        };
      }
      throw new Error(`Failed to resolve DID: ${resolveResponse.statusText}`);
    }
    const resolveData = await resolveResponse.json();
    if (!resolveData.success) {
      return {
        status: "NOT VERIFIED",
        reason: `DID resolution failed: ${
          resolveData.error || "Unknown error"
        }`,
      };
    }
    const didDoc = resolveData.didDocument;
    console.log(`[Verifier] Successfully resolved IOTA DID: ${didDoc.id}`);

    // Step 2: Check the vLEI credential for linkage
    console.log("[Verifier] Checking vLEI credential for linkage...");
    const credentialResponse = await fetch(
      `http://localhost:3000/.well-known/keri/Edef456_placeholder_credential_said`
    );
    if (!credentialResponse.ok) {
      throw new Error(
        `Failed to fetch credential: ${credentialResponse.statusText}`
      );
    }
    const credential = await credentialResponse.json();
    const alsoKnownAs = credential.a?.alsoKnownAs || [];
    const vleiDidWebs = alsoKnownAs.find((alias: string) => alias === iotaDid);

    if (!vleiDidWebs) {
      return {
        status: "NOT VERIFIED",
        reason: `The provided IOTA DID is not linked to any vLEI credential. Only DIDs that have been verified and linked to GLEIF vLEI credentials can be verified.`,
      };
    }
    console.log(`[Verifier] Found linkage in vLEI credential: ${vleiDidWebs}`);

    // Step 2: Verify the linkage by checking if alsoKnownAs is present
    console.log("[Verifier] Verifying linkage...");
    if (vleiDidWebs) {
      console.log("✅ SUCCESS: Linkage confirmed via vLEI credential!");

      // Extract the vLEI DID from the credential
      const vleiDid = credential.i;
      console.log(`[Verifier] vLEI DID: ${vleiDid}`);

      // Step 3: Create DID document and mint NFT attestation
      console.log(
        "[Verifier] Creating DID document and minting NFT attestation..."
      );
      const controller = `attestation-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      const createDidResponse = await fetch(`${BACKEND_URL}/create-did`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ controller }),
      });
      if (!createDidResponse.ok) {
        throw new Error("Failed to create DID");
      }
      const createDidData = await createDidResponse.json();
      if (!createDidData.success) {
        throw new Error(createDidData.error || "Failed to create DID");
      }
      const attestationDid = createDidData.did;
      const issuerAddress = createDidData.address;
      const immutableData = JSON.stringify(didDoc);
      const metadata = {
        type: "verification-attestation",
        originalDid: iotaDid,
        linkedDid: vleiDid,
        attestationDid: attestationDid.id,
      };
      try {
        const mintNftResponse = await fetch(`${BACKEND_URL}/mint-nft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            controller,
            issuerAddress,
            immutableData,
            metadata,
          }),
        });
        if (mintNftResponse.ok) {
          const mintNftData = await mintNftResponse.json();
          if (mintNftData.success) {
            const nft = mintNftData.nft;
            console.log(
              `[Verifier] Created attestation DID: ${attestationDid.id}, NFT: ${nft}`
            );
            return {
              status: "VERIFIED",
              originalDid: iotaDid,
              attestationDid: attestationDid.id,
              nftId: nft,
              issuerAddress,
            };
          } else {
            console.log(
              "[Verifier] NFT minting failed, not success:",
              mintNftData.error
            );
          }
        } else {
          console.log(
            "[Verifier] NFT minting failed, response not ok:",
            mintNftResponse.status,
            await mintNftResponse.text()
          );
        }
        console.log(
          "[Verifier] NFT minting failed, but verification successful"
        );
      } catch (nftError) {
        console.log(
          "[Verifier] NFT minting error, but verification successful:",
          (nftError as Error).message
        );
      }

      return {
        status: "VERIFIED",
        originalDid: iotaDid,
        attestationDid: attestationDid.id,
        issuerAddress,
        reason: "Verification successful",
      };
    } else {
      return {
        status: "NOT VERIFIED",
        reason:
          "The verified vLEI credential does not contain a valid link back to the provided IOTA DID.",
      };
    }
  } catch (error) {
    console.error(
      `[Verifier] Verification failed: ${(error as Error).message}`
    );
    return {
      status: "NOT VERIFIED",
      reason: `Could not resolve the DID from the DLT. Error: ${
        (error as Error).message
      }`,
    };
  }
}
