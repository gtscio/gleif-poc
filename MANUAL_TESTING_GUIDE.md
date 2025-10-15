# GLEIF POC Manual Testing Guide

## Overview

This comprehensive testing guide covers the complete end-to-end workflow for the GLEIF POC system, which implements real keripy signing and verification operations with actual cryptographic signatures and KERI database validation for vLEI ↔ TWIN ID linkage verification. The system consists of four main components that must be tested together for full functionality.

### System Components

1. **GLEIF POC Frontend** (`gleif-frontend/`): Next.js web application for user interaction
2. **Twin Service** (`twin-service/`): Backend service for DID and NFT operations
3. **Verification Service** (`verification-service/`): Python Flask service for KERI ACDC cryptographic verification
4. **DID Management** (`did-management/`): Scripts for identity creation and credential generation

### Prerequisites

- Node.js 18+
- Docker (for HashiCorp Vault)
- Basic understanding of DIDs and blockchain concepts
- Access to IOTA testnet

---

## 1. Service Startup Procedures

### ✅ Checklist: Environment Setup

- [ ] Install dependencies: `npm run install:all`
- [ ] Configure environment files:
  - [ ] `config.env` - IOTA network settings (NODE_URL, FAUCET_URL, COIN_TYPE, NETWORK, EXPLORER_URL)
  - [ ] `identity.env` - Default DID (optional)
  - [ ] `gleif-frontend/.env.local` - Frontend environment
  - [ ] `twin-service/.env` - Backend configuration

### ✅ Checklist: Vault Setup (Production-like Testing)

**Start HashiCorp Vault:**

```bash
docker run -d --name vault-dev -p 8200:8200 \
  -e VAULT_DEV_ROOT_TOKEN_ID=root \
  vault server -dev
```

**Configure Vault environment:**

```bash
cd twin-service
cp .env.vault .env
```

#### Enable Transit Secrets Engine

**Enable transit secrets engine:**

```bash
curl -X POST -H "X-Vault-Token: root" http://localhost:8200/v1/sys/mounts/transit -d '{"type": "transit"}'
```

**Create wallet key:**

```bash
curl -X POST -H "X-Vault-Token: root" http://localhost:8200/v1/transit/keys/wallet-key
```

**Expected Results:**

- Vault UI accessible at http://localhost:8200
- Vault token: `root`
- No errors in Vault startup logs

### ✅ Checklist: Start All Services

**Start Twin Service with Vault:**

```bash
cd twin-service
npm run start:vault
```

**Expected Results:**

- Service starts on http://localhost:3001
- Console shows: "Twin service with Vault started on port 3001"
- No connection errors to Vault

**Start Verification Service:**

```bash
cd verification-service
export GLEIF_ROOT_AID=$(jq -r '.i' ../gleif-frontend/public/.well-known/keri/gleif-incept.json)
source venv/bin/activate && PORT=5001 python3 app.py
```

**Expected Results:**

- Service starts on http://localhost:5001
- Console shows: "Starting KERI ACDC Verification Service on port 5001"
- Health check endpoint responds: `curl http://localhost:5001/health`

**Start Frontend:**

```bash
cd gleif-frontend
npm run dev
```

**Expected Results:**

- Frontend accessible at http://localhost:3000
- No build errors
- Console shows successful compilation

**Verify Services Status:**

```bash
# Check running processes
ps aux | grep -E "(node|npm|python3)"

# Test service endpoints
curl http://localhost:3001/create-did
curl http://localhost:5001/health
curl http://localhost:3000/api/verify -X POST -H "Content-Type: application/json" -d '{"did":"test"}'
```

---

## 2. DID Creation and Management Testing

### ✅ Checklist: Create New TWIN DID

**Execute DID creation:**

```bash
cd did-management
node manage-did.js
```

**Expected Results:**

- Console output: "✅ New TWIN ID created successfully! DID: did:iota:testnet:0x..."
- `twin-wallet.json` file created with DID information
- DID format: `did:iota:testnet:<objectId>` (e.g., `did:iota:testnet:0xe682944593311be353aa6e5d4cfb62041e407fc66c43586b31f87fe87be4309f`)

**Verify DID Creation:**

```bash
# Check wallet file
cat twin-wallet.json

# Test DID resolution via API
curl http://localhost:3001/resolve-did/$(jq -r '.did' twin-wallet.json)
```

**Expected API Response:**

```json
{
  "success": true,
  "didDocument": {
    "id": "did:iota:testnet:0x...",
    "alsoKnownAs": [
      "did:webs:localhost:3000:<real_legal_entity_aid>",
      "did:webs:localhost:3000"
    ]
  }
}
```

### ✅ Checklist: Generate Credentials

**Generate KERI credentials:**

```bash
cd did-management
chmod +x generate-credentials.sh
./generate-credentials.sh $(jq -r '.did' twin-wallet.json)
```

**Expected Results:**

- Files created in `gleif-frontend/public/.well-known/keri/`:
  - `icp/<legal_entity_aid>` (dynamically generated)
  - `legal-entity-credential.json` (ACDC for Legal Entity)
  - `qvi-credential.json` (ACDC for QVI → used to resolve issuer)
  - `gleif-incept.json` and `qvi-incept.json` (inception events)
- DID Configuration file created at `gleif-frontend/public/.well-known/did-configuration.json`
- Console output: "✅ Real cryptographic credentials generated successfully"

**Verify Credential Files:**

```bash
ls -la ../gleif-frontend/public/.well-known/keri/
cat ../gleif-frontend/public/.well-known/keri/legal-entity-credential.json
cat ../gleif-frontend/public/.well-known/keri/qvi-credential.json
cat ../gleif-frontend/public/.well-known/keri/gleif-incept.json
cat ../gleif-frontend/public/.well-known/did-configuration.json
```

---

## 3. Credential Generation Testing

### ✅ Checklist: Automated Credential Generation

**Test build-time credential generation:**

```bash
cd gleif-frontend
npm run build
```

**Expected Results:**

- Build completes successfully
- `scripts/ensure-credentials.js` executes automatically (via `prebuild` script)
- If credentials don't exist, script generates DID and real KERI cryptographic files
- KERI files present in `public/.well-known/keri/` with dynamically generated SAIDs

**Verify Credential Content:**

```bash
# Check ICP file (Legal Entity) - dynamically generated
cat public/.well-known/keri/icp/$(ls public/.well-known/keri/icp/)

# Check credential file - dynamically generated SAID
cat public/.well-known/keri/$(ls public/.well-known/keri/ | grep -v icp)
```

**Expected Credential Structure:**

- ICP file contains legal entity inception configuration with real cryptographic signatures
- Credential file contains ACDC with `alsoKnownAs` linking to TWIN DID, using real SAIDs

---

## 4. Real Cryptographic Operations

### Understanding Real Cryptographic Implementation

The system now uses real keripy signing and verification operations with actual cryptographic signatures and KERI database validation instead of any simulated components:

- **SAID Generation**: Credentials use Self-Addressing Identifiers (SAIDs) computed from content using SHA-256 hashing
- **Digital Signatures**: All credentials are signed using Ed25519 digital signatures through real keripy operations
- **KERI Protocol**: Full KERI (Key Event Receipt Infrastructure) implementation for identity management with database validation
- **ACDC Credentials**: Authenticated Chain Data Containers with cryptographic provenance and real signature chains

### Key Cryptographic Components:

1. **Legal Entity AID**: Dynamically generated identifier for the legal entity (GLEIF)
2. **Credential SAID**: Content-addressed identifier for the vLEI credential
3. **Signature Chains**: Cryptographic proof linking credentials to issuing authorities
4. **Verification Operations**: Real-time validation of signatures and SAID integrity

### Testing Real Cryptography:

- [ ] Verify SAIDs are computed correctly from credential content using real keripy operations
- [ ] Confirm digital signatures are valid and verifiable through actual cryptographic validation
- [ ] Test that credential tampering invalidates verification using real signature checking
- [ ] Ensure signature chains maintain cryptographic integrity with KERI database validation

---

## 5. Verification Flow Testing

### ✅ Checklist: End-to-End Verification Test

**Access Frontend:**

- Open [http://localhost:3000](http://localhost:3000) in browser
- Verify UI loads without errors

**Perform Verification:**

1. Enter the created TWIN DID in the input field
2. Select **DID Linking** and click "Verify Linkage"
3. Select **Domain Linkage** and click "Verify Linkage"

**Expected Results:**

- Both verification modes return "✅ VERIFIED"
- Attestation DID displayed
- NFT ID displayed
- Reason: "Verification successful"

**Verify Blockchain Artifacts:**

- Click "View Original DID Document" → Opens IOTA explorer
- Click "View Attestation DID Document" → Opens IOTA explorer
- Click "View NFT Attestation" → Opens IOTA explorer
- Click "View Issuer Wallet Address" → Opens IOTA explorer

### ✅ Checklist: API Verification Testing

**Test Verification Service health check:**

```bash
curl http://localhost:5001/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "service": "keri-acdc-verifier"
}
```

**Test KERI credential verification endpoint:**

```bash
jq -c '{credential: .}' ../gleif-frontend/public/.well-known/keri/legal-entity-credential.json > /tmp/payload.json
curl -X POST http://localhost:5001/verify \
  -H "Content-Type: application/json" \
  -d @/tmp/payload.json
```

**Expected Response:**

```json
{
  "success": true,
  "verified": true,
  "message": "Credential verified successfully",
  "details": {
    "credential_said": "<real_credential_said>",
    "issuer_aid": "<real_legal_entity_aid>",
    "issuance_chain": [...],
    "gleif_verified": true
  }
}
```

**Test Frontend verification endpoint:**

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"did": "'$(jq -r '.did' ../did-management/twin-wallet.json)'"}'
```

**Expected API Response:**

```json
{
  "status": "VERIFIED",
  "attestationDid": "did:iota:testnet:0x...",
  "nftId": "nft:0x...",
  "reason": "Verification successful"
}
```

**Verify Real Cryptographic Operations:**

- [ ] Confirm verification service logs show real keripy signing and verification operations (signature verification, SAID validation, etc.)
- [ ] Check that verification service performs actual KERI ACDC validation with real SAIDs and cryptographic signatures
- [ ] Verify that verification fails if credential signatures are invalid or SAIDs don't match using real cryptographic validation
- [ ] Confirm that the system uses real cryptographic primitives and KERI database validation, not any simulated components
- [ ] Test that credential tampering is detected and rejected through actual cryptographic verification

---

## 6. Frontend UI Testing

### ✅ Checklist: UI Functionality Test

**Test Input Validation:**

- [ ] Submit empty DID field → Error message displayed
- [ ] Submit invalid DID format → Error message displayed
- [ ] Submit valid DID → Processing indicator shown

**Test Status Display:**

- [ ] VERIFIED status → Green checkmark, success message
- [ ] NOT VERIFIED status → Red X, error message
- [ ] ERROR status → Red warning, error details

**Test Explorer Links:**

- [ ] All four explorer buttons functional
- [ ] Links open in new tabs
- [ ] Correct IOTA explorer URLs generated
- [ ] Network parameter correctly set (testnet)

**Test Responsive Design:**

- [ ] UI works on desktop (1920x1080)
- [ ] UI works on tablet (768x1024)
- [ ] UI works on mobile (375x667)

---

## 7. IOTA Explorer Link Testing

### ✅ Checklist: Explorer Integration Test

**Test DID Links:**

```bash
# Generate explorer URL for DID
node -e "
const { generateExplorerLink } = require('./lib/explorer-utils.ts');
const did = '$(jq -r '.did' ../did-management/twin-wallet.json)';
console.log('DID Explorer URL:', generateExplorerLink(did));
"
```

**Expected URL Format:**

```
https://explorer.iota.org/object/<objectId>?network=testnet
```

**Test NFT Links:**

- Extract NFT ID from verification response
- Verify URL format: `https://explorer.iota.org/nft/<nftId>?network=testnet`

**Test Address Links:**

- Extract issuer address from verification response
- Verify URL format: `https://explorer.iota.org/addr/<address>?network=testnet`

**Test Transaction Links:**

- Monitor for transaction IDs during NFT minting
- Verify URL format: `https://explorer.iota.org/tx/<txId>?network=testnet`

---

## 8. API Endpoint Testing

### ✅ Checklist: Twin Service API Tests

**Test DID Creation:**

```bash
curl -X POST http://localhost:3001/create-did
```

**Expected Response:**

```json
{
  "success": true,
  "did": {
    "id": "did:iota:testnet:0x...",
    "controller": "did:iota:testnet:0x..."
  }
}
```

**Test DID Resolution:**

```bash
curl http://localhost:3001/resolve-did/did:iota:testnet:0xe682944593311be353aa6e5d4cfb62041e407fc66c43586b31f87fe87be4309f
```

**Expected Response:**

```json
{
  "success": true,
  "didDocument": {
    "id": "did:iota:testnet:0x...",
    "alsoKnownAs": [
      "did:webs:localhost:3000:<real_legal_entity_aid>",
      "did:webs:localhost:3000"
    ]
  }
}
```

**Test NFT Minting:**

```bash
curl -X POST http://localhost:3001/mint-nft \
  -H "Content-Type: application/json" \
  -d '{
    "issuerAddress": "iota1...",
    "immutableData": "verification data",
    "metadata": {"type": "attestation"}
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "nft": {
    "id": "nft:0x...",
    "issuerAddress": "0x...",
    "immutableData": "..."
  }
}
```

### ✅ Checklist: Frontend API Tests

**Test Verification Endpoint:**

```bash
# Valid DID
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"did": "did:iota:testnet:0xe682944593311be353aa6e5d4cfb62041e407fc66c43586b31f87fe87be4309f"}'

# Invalid DID
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"did": "invalid-did"}'

# Missing DID
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 9. Error Scenario Testing

### ✅ Checklist: Service Unavailability Tests

**Test Twin Service Down:**

1. Stop twin-service: `pkill -f "twin-service"`
2. Attempt verification via frontend
3. **Expected:** ERROR status with connection failure message

**Test Vault Unavailable:**

1. Stop Vault container: `docker stop vault-dev`
2. Attempt DID creation
3. **Expected:** Vault connection error

**Test Frontend Build Issues:**

1. Delete KERI files: `rm -rf gleif-frontend/public/.well-known/keri/`
2. Attempt frontend build: `npm run build`
3. **Expected:** Build fails with missing credential files

### ✅ Checklist: Invalid Input Tests

**Test Invalid DID Formats:**

- Empty string
- Random text
- Malformed DID (missing parts)
- Wrong method (did:eth: instead of did:iota:)

**Expected Results:** "NOT VERIFIED" or "ERROR" status with appropriate message

### ✅ Checklist: Network Error Tests

**Test IOTA Network Issues:**

1. Modify `config.env` with invalid node URL
2. Attempt DID operations
3. **Expected:** Network connection errors

**Test Explorer Network Mismatch:**

1. Set `IOTA_NETWORK=mainnet` in environment
2. Use testnet DID for verification
3. **Expected:** Explorer links point to wrong network

### ✅ Checklist: Security Tests

**Test Vault Authentication:**

1. Modify Vault token in `.env`
2. Attempt secure operations
3. **Expected:** Authentication failures

**Test CORS Issues:**

1. Access API from different origin
2. **Expected:** CORS headers properly set

**Test Transit Engine Functionality:**

1. Verify transit engine is enabled: `curl -H "X-Vault-Token: root" http://localhost:8200/v1/sys/mounts`
2. Test key creation: `curl -X POST -H "X-Vault-Token: root" http://localhost:8200/v1/transit/keys/test-key`
3. Test encryption: `curl -X POST -H "X-Vault-Token: root" http://localhost:8200/v1/transit/encrypt/wallet-key -d '{"plaintext": "dGVzdCBkYXRh"}'`
4. **Expected:** All operations succeed without errors

---

## 10. Complete End-to-End Testing Workflow

### ✅ Master Checklist: Full System Test

**Phase 1: Environment Setup**

- [ ] Install all dependencies
- [ ] Configure environment files
- [ ] Start HashiCorp Vault
- [ ] Start Twin Service with Vault
- [ ] Start Verification Service
- [ ] Start Frontend application

**Phase 2: Identity Creation**

- [ ] Create new TWIN DID via API
- [ ] Generate KERI credentials
- [ ] Link DID with vLEI credentials
- [ ] Verify DID document structure

**Phase 3: Verification Testing**

- [ ] Test frontend UI functionality
- [ ] Perform verification via web interface
- [ ] Verify API endpoint responses
- [ ] Test all explorer links
- [ ] Confirm blockchain artifacts

**Phase 4: Error Handling**

- [ ] Test invalid inputs
- [ ] Test service failures
- [ ] Test network issues
- [ ] Verify error messages

**Phase 5: Performance Testing**

- [ ] Test concurrent verifications
- [ ] Monitor response times
- [ ] Check memory usage
- [ ] Verify stability under load

### Success Criteria

- [ ] All services start without errors
- [ ] DID creation succeeds with valid IOTA testnet transactions
- [ ] Credential generation creates proper KERI files with real SAIDs, cryptographic signatures, and keripy signing/verification operations
- [ ] Verification returns VERIFIED status for valid DIDs
- [ ] All explorer links functional and point to correct artifacts
- [ ] Frontend UI responsive and user-friendly
- [ ] Error scenarios handled gracefully with informative messages
- [ ] System stable under normal load conditions

### Troubleshooting Common Issues

**Port Conflicts:**

```bash
# Find conflicting processes
lsof -i :3000
lsof -i :3001
lsof -i :8200

# Kill processes
kill -9 <PID>
```

**Vault Connection Issues:**

```bash
# Check Vault status
docker logs vault-dev

# Test Vault connectivity
curl http://localhost:8200/v1/sys/health
```

**Build Failures:**

```bash
# Clear Next.js cache
cd gleif-frontend
rm -rf .next
npm install
npm run build
```

**DID Resolution Failures:**

- Verify IOTA testnet connectivity
- Check Vault configuration
- Confirm DID format validity
- Ensure real keripy signing and verification operations are properly implemented with actual cryptographic signatures and KERI database validation (not any simulated components)

**Transit Engine Issues:**

- **Symptom:** Transit engine operations fail with "path not found"
- **Solution:** Enable transit engine and create required keys

  ```bash
  # Enable transit
  curl -X POST -H "X-Vault-Token: root" http://localhost:8200/v1/sys/mounts/transit -d '{"type": "transit"}'

  # Create wallet key
  curl -X POST -H "X-Vault-Token: root" http://localhost:8200/v1/transit/keys/wallet-key
  ```

---

## 11. Testing Checklist Summary

- [ ] Service startup procedures completed
- [ ] DID creation and management tested
- [ ] Credential generation verified
- [ ] Verification flow functional
- [ ] Frontend UI tested
- [ ] IOTA explorer links working
- [ ] API endpoints responding correctly
- [ ] Error scenarios handled properly
- [ ] End-to-end workflow successful

**Test Completion Date:** **\_\_\_\_**
**Tester Name:** **\_\_\_\_**
**Environment:** **\_\_\_\_** (dev/staging/prod)
**Test Result:** **\_\_\_\_** (PASS/FAIL)
