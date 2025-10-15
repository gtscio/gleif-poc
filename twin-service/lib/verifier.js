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
        "The provided DID is invalid. Please ensure it starts with 'did:iota:' and is correctly formatted."
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
      throw new Error(
        "The verification method is not supported. Please choose either 'did-linking' or 'domain-linkage'."
      );
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
      throw new Error(
        "Unable to create a verification attestation. Please try again later."
      );
    }
    const createDidData = await createDidResponse.json();
    if (!createDidData.success) {
      throw new Error(
        createDidData.error ||
          "Unable to create a verification attestation. Please try again later."
      );
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
      reason: `Unable to retrieve the required credential for verification. Please check your connection and try again.`,
    };
  }
  const credential = await response.json();

  // Minimal DID ↔ credential binding: input DID must be present in credential.a.alsoKnownAs
  const alsoKnownAs = credential?.a?.alsoKnownAs;
  if (!Array.isArray(alsoKnownAs) || !alsoKnownAs.includes(iotaDid)) {
    return {
      status: "NOT VERIFIED",
      reason:
        "The provided DID is not linked to the credential. Please ensure the DID is correctly associated with the credential.",
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
      try {
        const errorData = await verifyResponse.json();
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Verification service returned status ${verifyResponse.status}`;
        return {
          status: "NOT VERIFIED",
          reason: errorMessage,
        };
      } catch (parseError) {
        return {
          status: "NOT VERIFIED",
          reason: `Verification service is currently unavailable. Please try again later.`,
        };
      }
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
        reason:
          verifyData.error ||
          "The credential verification failed. Please check the credential details and try again.",
        verificationDetails: {
          cryptographicStatus: "FAILED",
          failureReason:
            verifyData.error ||
            "The credential verification failed. Please check the credential details and try again.",
        },
      };
    }
  } catch (error) {
    return {
      status: "NOT VERIFIED",
      reason: `Unable to connect to the verification service. Please check your network connection and try again.`,
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
      reason:
        "The DID document does not contain domain linkage information. Please ensure the DID is properly configured for domain verification.",
    };
  }

  const domainOrigin = Array.isArray(linkedDomainService.serviceEndpoint)
    ? linkedDomainService.serviceEndpoint[0]
    : linkedDomainService.serviceEndpoint;

  if (typeof domainOrigin !== "string") {
    return {
      status: "NOT VERIFIED",
      reason:
        "The domain linkage configuration is incomplete. Please check the DID document setup.",
    };
  }

  const normalizedOrigin = domainOrigin.replace(/\/$/, "");
  const configUrl = `${normalizedOrigin}/.well-known/did-configuration.json`;
  const response = await fetch(configUrl);
  if (!response.ok) {
    return {
      status: "NOT VERIFIED",
      reason: `Unable to retrieve domain configuration. Please ensure the domain is properly configured for verification.`,
    };
  }

  const config = await response.json();
  const linkedDids = Array.isArray(config?.linked_dids)
    ? config.linked_dids
    : [];

  if (linkedDids.length === 0) {
    return {
      status: "NOT VERIFIED",
      reason:
        "The domain configuration does not contain any linked DIDs. Please verify the domain setup.",
    };
  }

  const jwt = linkedDids[0];
  if (typeof jwt !== "string") {
    return {
      status: "NOT VERIFIED",
      reason:
        "The domain configuration contains invalid data. Please check the domain setup.",
    };
  }

  try {
    const identityConnector = createReadOnlyIdentityConnector();
    const { verifiableCredential } =
      await identityConnector.checkVerifiableCredential(jwt);

    if (!verifiableCredential) {
      return {
        status: "NOT VERIFIED",
        reason:
          "The domain linkage credential could not be verified. Please ensure the domain is properly configured.",
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
        reason:
          "The domain linkage credential does not match the provided DID. Please verify the DID and domain association.",
      };
    }

    if (subjectOrigin !== normalizedOrigin) {
      return {
        status: "NOT VERIFIED",
        reason:
          "The domain linkage credential origin does not match the expected domain. Please verify the domain configuration.",
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
      reason: `An error occurred during domain linkage verification. Please try again or contact support if the issue persists.`,
    };
  }
}
