import {
  createIdentityResolverConnector,
  createIdentityConnector,
  createWalletConnector,
  createFaucetConnector,
  createNftConnector,
  createVaultConnector,
} from "./twin-connectors";
import { IDidDocument } from "@twin.org/standards-w3c-did";

/**
 * Creates a new wallet and returns the wallet details.
 * @returns Promise resolving to wallet information
 */
export async function createWallet(): Promise<{
  address: string;
  seed?: string;
}> {
  try {
    const identity = `wallet-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const walletConnector = createWalletConnector(identity);
    const vaultConnector = createVaultConnector();

    await walletConnector.create(identity);
    const addresses = await walletConnector.getAddresses(identity, 0, 0, 1);

    return { address: addresses[0] };
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error}`);
  }
}

/**
 * Funds a given address using the faucet connector.
 * @param address - The address to fund
 * @param amount - Optional amount to fund
 * @returns Promise resolving when funding is complete
 */
export async function fundAddress(
  address: string,
  amount?: number
): Promise<void> {
  const faucetConnector = createFaucetConnector();
  try {
    const identity = `faucet-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    await faucetConnector.fundAddress(identity, address);
  } catch (error) {
    throw new Error(`Failed to fund address: ${error}`);
  }
}

/**
 * Creates a new DID document.
 * @returns Promise resolving to the created DID document
 */
export async function createDIDDocument(): Promise<IDidDocument> {
  try {
    console.log(
      "🔍 Creating real IOTA testnet DID using TWIN Identity Connector..."
    );

    // Create an identity for the DID controller
    const controllerIdentity = `did-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;

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
      60
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

    return document;
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
 * Mints a new NFT.
 * @param issuerAddress - The address of the NFT issuer
 * @param immutableData - Immutable data for the NFT
 * @param metadata - Optional metadata for the NFT
 * @returns Promise resolving to the minted NFT details
 */
export async function mintNFT(
  issuerAddress: string,
  immutableData: string,
  metadata?: { [key: string]: unknown }
): Promise<{ id: string; [key: string]: unknown }> {
  const nftConnector = createNftConnector();
  try {
    const controller = `mint-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const nft = await nftConnector.mint(controller, immutableData, metadata);
    console.log("✅ NFT minted successfully! ID:", nft.id);
    return nft;
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
  const nftConnector = createNftConnector();
  try {
    const controller = `transfer-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const recipientIdentity = `recipient-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
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
