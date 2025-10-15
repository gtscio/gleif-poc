import { resolveDIDDocument } from "./twin-utils.ts";
import { createReadOnlyIdentityConnector } from "./twin-connectors.ts";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// Main router function
export async function verifyLinkage(iotaDid, verificationType) {
  try {
    console.log(`[Verifier] Starting LIVE verification for: ${iotaDid}`);

    // Validate DID format
    if (!iotaDid.startsWith("did:iota:")) {
      throw new Error(
        "Invalid DID format. Please provide a valid IOTA DID starting with 'did:iota:'."
      );
    }

    const didDoc = await resolveDIDDocument(iotaDid);
    console.log("Resolved didDoc:", didDoc);

    let verificationResult;
    let linkedDid;
    let linkedAid;
    let linkedDomain;

    if (verificationType === "did-linking") {
      console.log("Verifying via DID Linking (Issuer) Path...");
      verificationResult = await verifyViaDidLinking(didDoc, iotaDid);
      linkedAid = verificationResult.linkedAid;
    } else if (verificationType === "domain-linkage") {
      console.log("Verifying via W3C Domain Linkage (Self-Hosted) Path...");
      verificationResult = await verifyViaDomainLinkage(didDoc);
      linkedDid = verificationResult.linkedDid;
      linkedDomain = verificationResult.domainOrigin;
    } else {
      throw new Error("Invalid verification type specified.");
    }

    if (verificationResult.status !== "VERIFIED") {
      throw new Error(verificationResult.reason);
    }

    // On-chain attestation flow
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
      ...(linkedDid ? { linkedDid } : {}),
      ...(linkedAid ? { linkedAid } : {}),
      attestationDid: attestationDid.id,
      ...(linkedDomain ? { linkedDomain } : {}),
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
            ...(linkedDid ? { linkedDid } : {}),
            ...(linkedAid ? { linkedAid } : {}),
            ...(linkedDomain ? { linkedDomain } : {}),
            verificationDetails: verificationResult.verificationDetails,
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
      console.log("[Verifier] NFT minting failed, but verification successful");
    } catch (nftError) {
      console.log(
        "[Verifier] NFT minting error, but verification successful:",
        nftError.message
      );
    }

    return {
      status: "VERIFIED",
      originalDid: iotaDid,
      attestationDid: attestationDid.id,
      issuerAddress,
      ...(linkedDid ? { linkedDid } : {}),
      ...(linkedAid ? { linkedAid } : {}),
      ...(linkedDomain ? { linkedDomain } : {}),
      verificationDetails: verificationResult.verificationDetails,
    };
  } catch (error) {
    console.log("Error in verifyLinkage:", error);
    throw error;
  }
}

// Logic for Path 1
async function verifyViaDidLinking(didDoc, iotaDid) {
  // Fetch the credential dynamically from the frontend API
  const credentialUrl = `http://localhost:3000/api/credential`;
  const response = await fetch(credentialUrl);
  if (!response.ok) {
    return {
      status: "NOT VERIFIED",
      reason: `Failed to retrieve DID Linking credential (${response.status})`,
    };
  }
  const credential = await response.json();

  // Minimal DID ↔ credential binding: input DID must be present in credential.a.alsoKnownAs
  const alsoKnownAs = credential?.a?.alsoKnownAs;
  if (!Array.isArray(alsoKnownAs) || !alsoKnownAs.includes(iotaDid)) {
    return {
      status: "NOT VERIFIED",
      reason:
        "Input DID not present in credential.a.alsoKnownAs (DID-linking requires binding)",
    };
  }

  // Call Python verification service
  try {
    const verifyResponse = await fetch("http://localhost:5001/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, expected_did: iotaDid }),
    });

    if (!verifyResponse.ok) {
      return {
        status: "NOT VERIFIED",
        reason: `Python verification service error: ${verifyResponse.status}`,
      };
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.success && verifyData.verified) {
      return {
        status: "VERIFIED",
        linkedAid: credential.i,
        verificationDetails: {
          credentialSaid: verifyData.details?.credential_said,
          issuerAid: verifyData.details?.issuer_aid,
          issuanceChain: verifyData.details?.issuance_chain,
          gleifVerified: verifyData.details?.gleif_verified,
          cryptographicStatus: "VERIFIED",
          verificationSteps: [
            "Credential structure validation",
            "Issuer resolution and key state verification",
            "Cryptographic signature validation",
            "Issuance chain traversal",
            "GLEIF root of trust verification",
          ],
        },
      };
    } else {
      return {
        status: "NOT VERIFIED",
        reason: verifyData.error || "Verification failed by Python service",
        verificationDetails: {
          cryptographicStatus: "FAILED",
          failureReason:
            verifyData.error || "Verification failed by Python service",
        },
      };
    }
  } catch (error) {
    return {
      status: "NOT VERIFIED",
      reason: `Failed to connect to Python verification service: ${error.message}`,
    };
  }
}

// Logic for Path 2
async function verifyViaDomainLinkage(didDoc) {
  const services = Array.isArray(didDoc.service) ? didDoc.service : [];
  const linkedDomainService = services.find((service) => {
    if (typeof service !== "object" || !service) {
      return false;
    }
    const types = Array.isArray(service.type) ? service.type : [service.type];
    return types.includes("LinkedDomains");
  });

  if (!linkedDomainService) {
    return {
      status: "NOT VERIFIED",
      reason: "LinkedDomains service not found on DID document.",
    };
  }

  const domainOrigin = Array.isArray(linkedDomainService.serviceEndpoint)
    ? linkedDomainService.serviceEndpoint[0]
    : linkedDomainService.serviceEndpoint;

  if (typeof domainOrigin !== "string") {
    return {
      status: "NOT VERIFIED",
      reason: "LinkedDomains service is missing a valid endpoint.",
    };
  }

  const normalizedOrigin = domainOrigin.replace(/\/$/, "");
  const configUrl = `${normalizedOrigin}/.well-known/did-configuration.json`;
  const response = await fetch(configUrl);
  if (!response.ok) {
    return {
      status: "NOT VERIFIED",
      reason: `Failed to fetch did-configuration.json (${response.status})`,
    };
  }

  const config = await response.json();
  const linkedDids = Array.isArray(config?.linked_dids)
    ? config.linked_dids
    : [];

  if (linkedDids.length === 0) {
    return {
      status: "NOT VERIFIED",
      reason: "No linked_dids entries found in did-configuration.json.",
    };
  }

  const jwt = linkedDids[0];
  if (typeof jwt !== "string") {
    return {
      status: "NOT VERIFIED",
      reason: "Invalid linked_dids entry detected.",
    };
  }

  try {
    const identityConnector = createReadOnlyIdentityConnector();
    const { verifiableCredential } =
      await identityConnector.checkVerifiableCredential(jwt);

    if (!verifiableCredential) {
      return {
        status: "NOT VERIFIED",
        reason: "Domain Linkage credential verification failed.",
      };
    }

    const issuerDid = verifiableCredential.issuer;
    const credentialSubjectRaw = verifiableCredential.credentialSubject;
    const credentialSubject = Array.isArray(credentialSubjectRaw)
      ? credentialSubjectRaw[0]
      : credentialSubjectRaw;

    // Handle nested credentialSubject structure
    const actualSubject =
      credentialSubject?.credentialSubject || credentialSubject;
    const subjectDid = actualSubject?.id;
    const subjectOrigin = actualSubject?.origin;

    if (issuerDid !== didDoc.id || subjectDid !== didDoc.id) {
      return {
        status: "NOT VERIFIED",
        reason: "Domain Linkage credential does not match requested DID.",
      };
    }

    if (subjectOrigin !== normalizedOrigin) {
      return {
        status: "NOT VERIFIED",
        reason: "Domain Linkage credential origin mismatch.",
      };
    }

    return {
      status: "VERIFIED",
      linkedDid: issuerDid,
      domainOrigin: normalizedOrigin,
      verificationDetails: {
        credentialSaid: verifiableCredential.id,
        issuerDid: issuerDid,
        subjectDid: subjectDid,
        subjectOrigin: subjectOrigin,
        cryptographicStatus: "VERIFIED",
        verificationSteps: [
          "Domain linkage credential retrieval",
          "JWT verification and parsing",
          "Issuer and subject DID validation",
          "Domain origin verification",
        ],
        trustChain: [
          { level: "Domain Owner", did: issuerDid, type: "Self-Issued" },
          {
            level: "Domain Authority",
            domain: normalizedOrigin,
            type: "Verified",
          },
        ],
      },
    };
  } catch (error) {
    console.log("Domain linkage verification error:", error);
    return {
      status: "NOT VERIFIED",
      reason: `Domain Linkage credential verification error: ${error.message}`,
    };
  }
}
