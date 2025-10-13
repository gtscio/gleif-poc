import {
  createIdentityResolverConnector,
  createIdentityConnector,
  createWalletConnector,
  createFaucetConnector,
  createNftConnector,
  createVaultConnector,
} from "./twin-connectors";
import {
  DidVerificationMethodType,
  IDidDocument,
  IDidDocumentVerificationMethod,
  IDidService,
  IDidVerifiableCredential,
} from "@twin.org/standards-w3c-did";

/**
 * Creates a new DID document.
 * @param controllerIdentity - Optional identity for the controller
 * @returns Promise resolving to the created DID document and associated address
 */
export async function createDIDDocument(controllerIdentity?: string): Promise<{
  document: IDidDocument;
  address: string;
  controllerIdentity: string;
  defaultVerificationMethodId?: string;
}> {
  try {
    console.log(
      "🔍 Creating real IOTA testnet DID using TWIN Identity Connector..."
    );

    // Create an identity for the DID controller
    if (!controllerIdentity) {
      controllerIdentity = `did-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;
    }

    // Ensure vault connector is created first
    createVaultConnector();

    // Create wallet to store mnemonic
    const walletConnector = createWalletConnector(controllerIdentity);
    await walletConnector.create(controllerIdentity);

    // Fund the wallet
    const addresses = await walletConnector.getAddresses(
      controllerIdentity,
      0,
      0,
      1
    );
    await createFaucetConnector().fundAddress(
      controllerIdentity,
      addresses[0],
      100
    );

    const identityConnector = createIdentityConnector(controllerIdentity);

    console.log("Identity connector created with config:", {
      nodeUrl:
        process.env.IDENTITY_IOTA_NODE_ENDPOINT ||
        "https://api.testnet.iota.cafe",
      network: process.env.IDENTITY_IOTA_NETWORK || "testnet",
    });
    if (!identityConnector) {
      throw new Error("Identity connector not available");
    }
    // Create the DID document using the real TWIN connector
    const document = await identityConnector.createDocument(controllerIdentity);

    console.log(
      "✅ New IOTA testnet DID created successfully using TWIN Identity Connector! DID:",
      document.id
    );

    console.log(
      "✅ DID document created, adding default verification method..."
    );
    let defaultVerificationMethodId: string | undefined;
    try {
      const verificationMethod = await identityConnector.addVerificationMethod(
        controllerIdentity,
        document.id,
        DidVerificationMethodType.AssertionMethod,
        "key-1"
      );
      if (
        verificationMethod &&
        typeof verificationMethod === "object" &&
        "id" in verificationMethod
      ) {
        defaultVerificationMethodId = (verificationMethod as { id?: string })
          .id;
      }
      console.log(
        "✅ Added default verification method",
        defaultVerificationMethodId
      );
    } catch (error) {
      console.error(
        "⚠️ Failed to add default verification method, downstream operations may fail:",
        error
      );
    }

    let resolvedDocument: IDidDocument = document;
    try {
      const refreshedDocument = await resolveDIDDocument(document.id);
      if (refreshedDocument) {
        resolvedDocument = refreshedDocument;
      }
    } catch (resolveError) {
      console.warn(
        "⚠️ Could not refresh DID document after method insertion, using initial document:",
        resolveError
      );
    }

    if (
      !defaultVerificationMethodId &&
      Array.isArray(resolvedDocument.verificationMethod)
    ) {
      const firstMethod = resolvedDocument.verificationMethod[0] as
        | string
        | IDidDocumentVerificationMethod
        | undefined;
      if (typeof firstMethod === "string") {
        defaultVerificationMethodId = firstMethod;
      } else {
        defaultVerificationMethodId = firstMethod?.id;
      }
    }

    console.log("Document keys:", Object.keys(resolvedDocument));
    console.dir(resolvedDocument, { depth: null });
    console.log("Returning controller identity", controllerIdentity);
    console.log(
      "Default verification method id",
      defaultVerificationMethodId || "<none>"
    );

    return {
      document: resolvedDocument,
      address: addresses[0],
      controllerIdentity,
      defaultVerificationMethodId,
    };
  } catch (error) {
    console.log("❌ Failed to create DID document:", (error as Error).message);
    console.log("Full error details:", error);
    throw new Error(`Failed to create DID document: ${error}`);
  }
}

/**
 * Resolves a DID document from IOTA.
 * @param did - The DID to resolve
 * @returns Promise resolving to the resolved DID document
 */
export async function resolveDIDDocument(did: string): Promise<any> {
  const identityResolverConnector = createIdentityResolverConnector();
  if (!identityResolverConnector) {
    throw new Error("Identity resolver connector not available");
  }
  try {
    const document = await identityResolverConnector.resolveDocument(did);
    return document;
  } catch (error) {
    throw new Error(`Failed to resolve DID document: ${error}`);
  }
}

/**
 * Ensure the DID document exposes a LinkedDomains service for the supplied origin.
 * @param controllerIdentity - Vault identity that controls the DID
 * @param did - The DID document identifier
 * @param domainOrigin - The HTTPS origin to advertise
 */
export async function upsertLinkedDomainsService(
  controllerIdentity: string,
  did: string,
  domainOrigin: string
): Promise<IDidService> {
  const identityConnector = createIdentityConnector(controllerIdentity);
  const serviceId = "linked-domain";
  const fullServiceId = `${did}#${serviceId}`;

  try {
    await identityConnector.removeService(controllerIdentity, fullServiceId);
  } catch (error) {
    // Ignore missing service errors
    if (!(error instanceof Error && /notFound/i.test(error.message))) {
      console.log("⚠️ Failed to remove existing linked domain service:", error);
    }
  }

  const service = await identityConnector.addService(
    controllerIdentity,
    did,
    serviceId,
    "LinkedDomains",
    domainOrigin
  );

  return service;
}

/**
 * Create a Domain Linkage credential JWT for the provided origin.
 * @param controllerIdentity - Vault identity that controls the DID
 * @param verificationMethodId - Verification method used to sign the credential
 * @param domainOrigin - Domain origin asserted in the credential
 * @param credentialId - Optional identifier for the credential
 */
export async function createDomainLinkageCredential(
  controllerIdentity: string,
  verificationMethodId: string,
  domainOrigin: string,
  credentialId?: string
): Promise<{ jwt: string; credential: IDidVerifiableCredential }> {
  const identityConnector = createIdentityConnector(controllerIdentity);
  const didFromVerificationMethod = verificationMethodId.includes("#")
    ? verificationMethodId.split("#")[0]
    : verificationMethodId;
  const subject = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://identity.foundation/.well-known/did-configuration/v1",
    ],
    type: ["VerifiableCredential", "DomainLinkageCredential"],
    credentialSubject: {
      id: didFromVerificationMethod,
      origin: domainOrigin,
    },
  };

  const { verifiableCredential, jwt } =
    await identityConnector.createVerifiableCredential(
      controllerIdentity,
      verificationMethodId,
      credentialId,
      subject
    );

  return {
    jwt,
    credential: verifiableCredential,
  };
}

/**
 * Mints a new NFT.
 * @param controllerIdentity - The identity for the controller
 * @param issuerAddress - The address of the NFT issuer
 * @param immutableData - Immutable data for the NFT
 * @param metadata - Optional metadata for the NFT
 * @returns Promise resolving to the minted NFT details
 */
export async function mintNFT(
  controllerIdentity: string,
  issuerAddress: string,
  immutableData: string,
  metadata?: { [key: string]: unknown }
): Promise<{ id: string; [key: string]: unknown }> {
  // Ensure vault connector is created first
  createVaultConnector();

  try {
    const controller =
      controllerIdentity ||
      `mint-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    const nftConnector = createNftConnector(controller);
    await nftConnector.start(controller);
    const tag = "verification-attestation";
    const nftId = await nftConnector.mint(
      controller,
      tag,
      immutableData,
      metadata
    );
    console.log("✅ NFT minted successfully! ID:", nftId);
    return nftId;
  } catch (error) {
    throw new Error(`Failed to mint NFT: ${error}`);
  }
}

/**
 * Transfers an NFT to a new owner.
 * @param nftId - The ID of the NFT to transfer
 * @param toAddress - The address to transfer the NFT to
 * @param fromAddress - The current owner address
 * @param amount - Optional amount (for fractional NFTs)
 * @returns Promise resolving when transfer is complete
 */
export async function transferNFT(
  nftId: string,
  toAddress: string,
  fromAddress: string,
  amount?: number
): Promise<void> {
  try {
    const controller = `transfer-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const recipientIdentity = `recipient-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const nftConnector = createNftConnector(controller);
    await nftConnector.start(controller);
    await nftConnector.transfer(
      controller,
      nftId,
      recipientIdentity,
      toAddress
    );
  } catch (error) {
    throw new Error(`Failed to transfer NFT: ${error}`);
  }
}

/**
 * Verifies linkage for a DID with a specific verification type.
 * @param did - The DID to verify
 * @param verificationType - The type of verification
 * @returns Promise resolving to verification result
 */
export async function verifyLinkage(
  did: string,
  verificationType: string
): Promise<any> {
  // Placeholder implementation - to be expanded based on requirements
  console.log(
    `Verifying linkage for DID: ${did} with type: ${verificationType}`
  );
  // For now, return a basic result
  return { status: "VERIFIED", did, verificationType };
}
