# GLEIF POC Manual Testing Guide

## Overview

This comprehensive testing guide covers the complete end-to-end workflow for the GLEIF POC system, which demonstrates vLEI ↔ TWIN ID linkage verification. The system consists of four main components that must be tested together for full functionality.

### System Components

1. **GLEIF POC Frontend** (`gleif-frontend/`): Next.js web application for user interaction
2. **Twin Service** (`twin-service/`): Backend service for DID and NFT operations
3. **DID Management** (`did-management/`): Scripts for identity creation and credential generation

### Prerequisites

- Node.js 20+
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
ps aux | grep -E "(node|npm)"

# Test service endpoints
curl http://localhost:3001/create-did
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
    "alsoKnownAs": ["did:webs:localhost:3000:Eabc123_placeholder_legal_entity_aid", "did:web:localhost:3000"]
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
  - `icp/Eabc123_placeholder_legal_entity_aid`
  - `Edef456_placeholder_credential_said`
- DID Configuration file created at `gleif-frontend/public/.well-known/did-configuration.json`
- Console output: "✅ Placeholder cryptographic files created"

**Verify Credential Files:**

```bash
ls -la ../gleif-frontend/public/.well-known/keri/
cat ../gleif-frontend/public/.well-known/keri/Edef456_placeholder_credential_said
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
- If credentials don't exist, script generates DID and KERI files
- KERI files present in `public/.well-known/keri/`

**Verify Credential Content:**

```bash
# Check ICP file (Legal Entity)
cat public/.well-known/keri/icp/Eabc123_placeholder_legal_entity_aid

# Check credential file
cat public/.well-known/keri/Edef456_placeholder_credential_said
```

**Expected Credential Structure:**

- ICP file contains legal entity inception configuration
- Credential file contains ACDC with `alsoKnownAs` linking to TWIN DID

---

## 4. Verification Flow Testing

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

**Test verification endpoint:**

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

---

## 5. Frontend UI Testing

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

## 6. IOTA Explorer Link Testing

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

## 7. API Endpoint Testing

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
    "alsoKnownAs": ["did:webs:localhost:3000:Eabc123_placeholder_legal_entity_aid", "did:web:localhost:3000"]
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

## 8. Error Scenario Testing

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

## Complete End-to-End Testing Workflow

### ✅ Master Checklist: Full System Test

**Phase 1: Environment Setup**
- [ ] Install all dependencies
- [ ] Configure environment files
- [ ] Start HashiCorp Vault
- [ ] Start Twin Service with Vault
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
- [ ] Credential generation creates proper KERI files
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

## Testing Checklist Summary

- [ ] Service startup procedures completed
- [ ] DID creation and management tested
- [ ] Credential generation verified
- [ ] Verification flow functional
- [ ] Frontend UI tested
- [ ] IOTA explorer links working
- [ ] API endpoints responding correctly
- [ ] Error scenarios handled properly
- [ ] End-to-end workflow successful

**Test Completion Date:** ________
**Tester Name:** ________
**Environment:** ________ (dev/staging/prod)
**Test Result:** ________ (PASS/FAIL)