import {
  IotaIdentityResolverConnector,
  IotaIdentityConnector,
} from "@twin.org/identity-connector-iota";
import {
  IotaWalletConnector,
  IotaFaucetConnector,
} from "@twin.org/wallet-connector-iota";
import { IotaNftConnector } from "@twin.org/nft-connector-iota";
import { HashicorpVaultConnector } from "@twin.org/vault-connector-hashicorp";
import { VaultConnectorFactory } from "@twin.org/vault-models";
import {
  FaucetConnectorFactory,
  WalletConnectorFactory,
} from "@twin.org/wallet-models";

// Create the vault connector instance
const vaultConnector = new HashicorpVaultConnector({
  config: {
    endpoint: process.env.VAULT_ENDPOINT || "http://localhost:8200",
    token: process.env.VAULT_TOKEN || "root",
  },
});

// Register the vault connector
VaultConnectorFactory.register("vault", () => vaultConnector);

// Register the faucet connector
FaucetConnectorFactory.register("faucet", () => iotaFaucetConnector);

// IOTA Network Configuration from environment
const nodeUrl =
  process.env.IDENTITY_IOTA_NODE_ENDPOINT || "https://api.testnet.iota.cafe";
const faucetUrl =
  process.env.IDENTITY_IOTA_FAUCET_ENDPOINT ||
  "https://faucet.testnet.iota.cafe";
const network = process.env.IDENTITY_IOTA_NETWORK || "testnet";
const isTestnet = network === "testnet";

let iotaIdentityResolverConnector: any = null;
let iotaFaucetConnector: any = null;
let iotaNftConnector: any = null;
let hashicorpVaultConnector: any = null;

export function createIdentityResolverConnector() {
  if (!iotaIdentityResolverConnector) {
    iotaIdentityResolverConnector = new IotaIdentityResolverConnector({
      config: {
        clientOptions: {
          url: nodeUrl,
        },
        network: network,
      },
    });
  }
  return iotaIdentityResolverConnector;
}

export function createIdentityConnector(vaultMnemonicId: string) {
  return new IotaIdentityConnector({
    config: {
      clientOptions: {
        url: nodeUrl,
      },
      network: network,
      vaultMnemonicId,
    },
  });
}

export function createWalletConnector(vaultMnemonicId: string) {
  const wallet = new IotaWalletConnector({
    config: {
      clientOptions: {
        url: nodeUrl,
      },
      network: network,
      vaultMnemonicId,
      vaultSeedId: "test-seed",
    },
  });
  WalletConnectorFactory.register(vaultMnemonicId, () => wallet);
  return wallet;
}

export function createFaucetConnector() {
  if (!iotaFaucetConnector) {
    iotaFaucetConnector = new IotaFaucetConnector({
      config: {
        clientOptions: {
          url: nodeUrl,
        },
        network: network,
        endpoint: faucetUrl,
      },
    });
  }
  return iotaFaucetConnector;
}

export function createNftConnector(vaultMnemonicId?: string) {
  // For now, create a new instance each time if vaultMnemonicId is provided
  if (!vaultMnemonicId) {
    if (!iotaNftConnector) {
      iotaNftConnector = new IotaNftConnector({
        config: {
          clientOptions: {
            url: nodeUrl,
          },
          network: network,
        },
      });
    }
    return iotaNftConnector;
  } else {
    const nftConnector = new IotaNftConnector({
      config: {
        clientOptions: {
          url: nodeUrl,
        },
        network: network,
        vaultMnemonicId,
      },
      walletConnectorType: vaultMnemonicId,
    });
    return nftConnector;
  }
}

export function createVaultConnector() {
  return vaultConnector;
}
