// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 *
 */
type IotaNetworkName = "testnet" | "mainnet" | "devnet" | string;

/**
 * Resolve the IOTA network name from environment or fallback to 'testnet'.
 * @returns The IOTA network name.
 */
function getIotaNetwork(): IotaNetworkName {
  const network = process.env.IOTA_NETWORK;
  return network && network.length > 0 ? network : "testnet";
}

/**
 * Get the explorer host for the given network from environment or fallback to network-specific defaults.
 * @returns The explorer host URL.
 */
function getExplorerHost(): string {
  const network = getIotaNetwork();
  if (process.env.IDENTITY_IOTA_EXPLORER_ENDPOINT) {
    return process.env.IDENTITY_IOTA_EXPLORER_ENDPOINT;
  }
  // Network-specific defaults based on IOTA SDK
  if (network === "mainnet") {
    return "https://explorer.rebased.iota.org";
  }
  // For testnet, devnet, etc., use the main explorer
  return "https://explorer.iota.org";
}

/**
 * Extract the network from an IOTA DID.
 * @param did The DID to extract the network from.
 * @returns The network name or undefined if not an IOTA DID.
 */
function extractNetworkFromDid(did: string): string | undefined {
  const iotaMatch = /did:iota:(.+)/.exec(did);
  if (iotaMatch) {
    const parts = iotaMatch[1].split(":");
    // The network is the first part after "did:iota:"
    return parts[0];
  }
  return undefined;
}

/**
 * Extract the object ID from a DID (the hex part after the network prefix).
 * This is the same logic as extractAliasId() in IotaIdentityConnector.
 * @param did The DID to extract the object ID from.
 * @returns The object ID.
 */
function extractObjectId(did: string): string {
  // Handle did:entity-storage: format
  const entityStorageMatch = /did:entity-storage:(.+)/.exec(did);
  if (entityStorageMatch) {
    return entityStorageMatch[1];
  }

  // Handle did:iota: format - extract the last part (object ID)
  const iotaMatch = /did:iota:(.+)/.exec(did);
  if (iotaMatch) {
    const parts = iotaMatch[1].split(":");
    // Return the last part (object ID)
    return parts[parts.length - 1];
  }

  // If no match, return the original DID
  return did;
}

/**
 * Generate an explorer link for a DID.
 * The DID is an IOTA object identifier, so we point to the object view.
 * @param did The DID to generate the explorer link for.
 * @param network The IOTA network name (optional, will be extracted from DID if not provided).
 * @returns The explorer link URL.
 */
export function generateExplorerLink(
  did: string,
  network?: IotaNetworkName
): string {
  const explorerHost = getExplorerHost();
  const objectId = extractObjectId(did);
  // Extract network from DID if not provided
  const didNetwork = extractNetworkFromDid(did);
  const finalNetwork = network || didNetwork || getIotaNetwork();
  return `${explorerHost}/object/${objectId}?network=${finalNetwork}`;
}

/**
 * Generates a URL to view a transaction on the IOTA explorer
 * @param txId - The transaction ID to view
 * @returns The explorer URL for the transaction
 */
export function getTransactionExplorerUrl(txId: string): string {
  const explorerHost = getExplorerHost();
  const network = getIotaNetwork();
  return `${explorerHost}/tx/${encodeURIComponent(txId)}?network=${network}`;
}

/**
 * Generates a URL to view an NFT on the IOTA explorer
 * @param nftId - The NFT ID to view
 * @returns The explorer URL for the NFT
 */
export function getNftExplorerUrl(nftId: string): string {
  const explorerHost = getExplorerHost();
  const network = getIotaNetwork();
  return `${explorerHost}/nft/${encodeURIComponent(nftId)}?network=${network}`;
}

/**
 * Generates a URL to view a wallet address on the IOTA explorer
 * @param address - The wallet address to view
 * @returns The explorer URL for the address
 */
export function getAddressExplorerUrl(address: string): string {
  const explorerHost = getExplorerHost();
  const network = getIotaNetwork();
  return `${explorerHost}/addr/${encodeURIComponent(
    address
  )}?network=${network}`;
}

/**
 * Opens a URL in a new tab/window
 * @param url - The URL to open
 */
export function openExplorerUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
