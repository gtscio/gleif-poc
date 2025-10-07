# GLEIF POC — vLEI ↔ TWIN ID Linkage Verifier

This project links a GLEIF vLEI (verifiable Legal Entity Identifier) to a TWIN ID on the IOTA testnet. It features a Next.js frontend, an Express backend, and optional HashiCorp Vault integration for secure DID (Decentralized Identifier) operations.

-----

## ✨ Goals

- Link a vLEI to a TWIN ID and verify the linkage in both directions.
- Ensure minimal local setup requirements (Vault is optional).
- Perform all operations on the real IOTA testnet.

-----

## 📂 Structure

The project is organized into the following directories:

- `gleif-frontend/`: The Next.js UI, which includes a backend API route at `/api/verify`.
- `twin-service/`: The Express backend for managing DIDs and NFTs.
- `did-management/`: Contains scripts like `manage-did.js` and `generate-credentials.sh` for identity management.
- `test-e2e.sh`: An end-to-end testing script.

-----

## 🛠️ Prerequisites

Before you begin, make sure you have the following installed:

- Node.js v18 or later
- npm (Node Package Manager)
- Docker
- `jq` (command-line JSON processor)
- Git

-----

## 🚀 Quickstart

You can run the project with or without HashiCorp Vault.

### With Vault (Recommended)

1. **Start Vault:**

    ```bash
    docker run -d --name vault-dev -p 8200:8200 -e VAULT_DEV_ROOT_TOKEN_ID=root hashicorp/vault server -dev
    ```

2. **Start the Backend:**

    ```bash
    cd twin-service && cp .env.vault .env && npm run start:vault
    ```

3. **Generate Credentials:**

    ```bash
    cd ./did-management && node manage-did.js && ./generate-credentials.sh $(jq -r '.did' twin-wallet.json)
    ```

4. **Start the Frontend:**

    ```bash
    cd ./gleif-frontend && npm run dev
    ```

> 👉 The services will be available at: **Frontend**: `http://localhost:3000`, **Backend**: `http://localhost:3001`, **Vault**: `http://localhost:8200`.

### Without Vault

1. **Start the Backend:**

    ```bash
    cd twin-service && npm run start
    ```

2. **Start the Frontend:**

    ```bash
    cd ../gleif-frontend && npm run dev
    ```

-----

## ⚙️ Environment Variables

Configure the services using these environment variables in a `.env` file:

```env
# URL for the backend service
BACKEND_URL=http://localhost:3001

# Enable or disable Vault integration
VAULT_ENABLED=true|false

# Vault connection details (if enabled)
VAULT_ENDPOINT=https://vault.example.com:8200
VAULT_ROLE_ID=<id>
VAULT_SECRET_ID=<id>

# IOTA network configuration
NETWORK=testnet|mainnet
NODE_URL=https://api.testnet.iota.cafe
```

-----

## 🕹️ Core Commands

Here are some useful commands to manage the project:

```bash
# Install all dependencies
npm run install:all

# Start the frontend development server
npm run dev

# Start the backend development server with Vault enabled
npm run dev:vault

# Run the end-to-end test script
chmod +x test-e2e.sh && ./test-e2e.sh
```

-----

## 📡 API Endpoints

### Frontend API

- `POST /api/verify`: Verifies the linkage between a vLEI and a TWIN ID.

    **Request Body:**

    ```json
    {
      "did": "did:iota:..."
    }
    ```

    **Response:**
    Returns the verification `status`, `attestationDid`, `nftId`, and a `reason` for the result.

### Backend Service

- `POST /create-did`: Creates a new Decentralized Identifier.
- `GET /resolve-did/:did`: Resolves a DID document.
- `POST /mint-nft`: Mints a new NFT associated with a DID.
- `POST /transfer-nft`: Transfers an NFT to another address.

-----

## 🐛 Troubleshooting

- **Ports are busy:**
    Find and stop the process using the port: `lsof -ti:3000,3001,8200 | xargs kill -9`
- **Vault issues:**
    Check the container logs: `docker logs vault-dev`
- **npm installation fails:**
    Clear the npm cache and reinstall: `npm cache clean --force && rm -rf node_modules && npm install`
- **Credentials missing:**
    Rerun the generation script: `./generate-credentials.sh`

-----

## ☁️ Deployment

- **Frontend:** Deploy to **Vercel**.
- **Backend:** Deploy to **Railway**.
- **Secrets:** Manage `VERCEL_TOKEN`, `RAILWAY_TOKEN`, and Vault credentials in your deployment provider's environment variables.
- **Documentation:** See `docs/vault.md`, `docs/deploy.md`, and `docs/troubleshooting.md` for more details.

-----

## 🔒 Security

- **Authentication:** Uses Vault's **AppRole** method for secure machine-to-machine authentication.
- **Secrets Management:** Rotate secrets regularly. **Never** commit tokens or secret IDs to the repository.

-----

## 🤝 Contributing

1. **Fork** the repository.
2. Create a new feature **branch**.
3. Run the tests to ensure everything passes: `./test-e2e.sh`.
4. Submit a **Pull Request**.

-----

## 📄 License

This project is licensed under the **MIT License**.
