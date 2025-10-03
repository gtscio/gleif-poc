# Twin Service

Backend service for TWIN operations including DID management, wallet operations, and NFT minting.

## Features

- DID Document creation and resolution
- Wallet management with secure key storage in Vault
- NFT minting and transfer operations
- Integration with IOTA Tangle

## Modes

### Mock Mode (Default)
Uses mock implementations for development and testing.

```bash
npm start
# or
npm run start:mock
```

### Vault Mode
Uses HashiCorp Vault for secure key storage.

#### Prerequisites
1. Run HashiCorp Vault using Docker:

```bash
docker run -d --name vault-dev -p 8200:8200 \
  -e VAULT_DEV_ROOT_TOKEN_ID=root \
  vault server -dev
```

**Alternative: Install locally with Homebrew (macOS):**
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/vault
vault server -dev -dev-root-token-id="root"
```

#### Configuration
Copy the vault environment file:
```bash
cp .env.vault .env
```

Or set environment variables:
```bash
export VAULT_ENABLED=true
export VAULT_ENDPOINT=http://localhost:8200
export VAULT_TOKEN=root
```

#### Running with Vault
```bash
npm run start:vault
```

## API Endpoints

- `POST /create-did` - Create a new DID document
- `GET /resolve-did/:did` - Resolve a DID document
- `POST /mint-nft` - Mint a new NFT
- `POST /transfer-nft` - Transfer an NFT

## Security

When using Vault mode:
- Wallet seeds are stored securely in Vault under `wallet/{identity}/seed`
- DID private keys are stored securely in Vault under `did/{did}/privateKey`
- All sensitive cryptographic material is protected by Vault's security features