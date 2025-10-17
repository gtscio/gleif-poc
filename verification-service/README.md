# KERI ACDC Verification Service

## Overview

This service is a key component of our Proof of Concept (POC) for GLEIF's verifiable Legal Entity Identifier (vLEI) system. It acts as a trusted verifier that checks the authenticity and validity of digital credentials issued to legal entities. In simple terms, it ensures that when a company presents a credential proving its identity and qualifications, that credential is genuine and comes from authorized sources within the GLEIF ecosystem.

The service replicates the verification process used by "Sally," a reference verifier in GLEIF's vLEI workflow. It validates credentials through a chain of trust, starting from the individual legal entity up to GLEIF itself, using advanced cryptographic methods to prevent fraud and ensure data integrity.

A Python Flask service that performs full cryptographic verification of KERI ACDC (Authentic Chained Data Container) credentials, replicating the verification logic of the "Sally" verifier in the GLEIF vLEI workflow.

## Key Features

- **Complete Trust Chain Validation**: Checks the entire path of credential issuance from the individual legal entity through Qualified vLEI Issuers (QVI) to GLEIF
- **Digital Signature Verification**: Ensures all cryptographic signatures are valid and authentic
- **GLEIF Trust Anchor**: Verifies that credentials ultimately come from GLEIF's trusted root authority
- **Web API**: Provides simple web endpoints for checking credentials
- **Detailed Logging**: Records comprehensive information for troubleshooting and monitoring

## How It Works

The verification process follows a clear chain of trust:

```
┌─────────────────┐
│ Legal Entity    │
│ presents        │
│ credential      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ QVI (Qualified  │
│ vLEI Issuer)    │
│ verifies &      │
│ endorses        │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ GLEIF Root     │
│ Authority      │
│ confirms       │
│ ultimate trust │
└─────────┬───────┘
          │
          ▼
    ┌─────────────┐
    │ ✅ VALIDATED │
    │ Credential   │
    │ is authentic │
    └─────────────┘
```

### API Endpoints

#### POST /verify

Checks if a digital credential is valid and trustworthy.

**What to Send:**

```json
{
  "credential": {
    "v": "ACDC10JSON00017a_",
    "d": "Edef456_placeholder_credential_said",
    "i": "Eabc123_placeholder_legal_entity_aid",
    "s": "E123_SCHEMA_ID_PLACEHOLDER",
    "a": {
      "alsoKnownAs": [
        "did:iota:testnet:0xe682944593311be353aa6e5d4cfb62041e407fc66c43586b31f87fe87be4309f"
      ]
    },
    "p": { "d": "QVI_SIGNATURE_SAID_SIMULATED" }
  },
  "issuer_aid": "optional_override_aid"
}
```

**Successful Response:**

```json
{
  "success": true,
  "verified": true,
  "message": "Credential verified successfully",
  "details": {
    "verified": true,
    "credential_said": "Edef456_placeholder_credential_said",
    "issuer_aid": "Eabc123_placeholder_legal_entity_aid",
    "issuance_chain": [
      {
        "level": "Legal Entity",
        "aid": "Eabc123_placeholder_legal_entity_aid",
        "credential_type": "Designated Aliases"
      },
      {
        "level": "QVI",
        "aid": "QVI_ISSUER_AID_SIMULATED",
        "credential_type": "Qualified vLEI Issuer"
      },
      {
        "level": "GLEIF",
        "aid": "GLEIF_ROOT_AID_SIMULATED",
        "credential_type": "Root Authority"
      }
    ],
    "gleif_verified": true
  }
}
```

**Failed Response:**

```json
{
  "success": false,
  "verified": false,
  "error": "Verification failed: [reason]",
  "details": {...}
}
```

#### GET /health

Basic health check to confirm the service is running.

## Getting Started

### Quick Setup

1. **Install Required Software:**

```bash
pip install -r requirements.txt
```

2. **Set Up Configuration:**

Create a `.env` file with these settings:

```bash
PORT=5001
GLEIF_ROOT_AID=GLEIF_ROOT_AID_SIMULATED
LOG_LEVEL=INFO
```

**Configuration Options:**
- **PORT**: Which network port the service uses (default: 5000)
- **GLEIF_ROOT_AID**: The main GLEIF identifier for trust verification. Use `GLEIF_ROOT_AID_SIMULATED` for testing, or the real GLEIF ID for production
- **LOG_LEVEL**: How much detail to log (DEBUG, INFO, WARNING, ERROR)

3. **Load GLEIF Trust Settings:**

For real verification, set the GLEIF root identifier from the generated setup file:

```bash
export GLEIF_ROOT_AID=$(jq -r '.i' ../gleif-frontend/public/.well-known/keri/gleif-incept.json)
```

4. **Start the Service:**

```bash
python app.py
```

## Data Storage

The service maintains a database to keep track of issuer information and verification history. This database is set up automatically when the service starts, in a `db` folder within the service directory.

**Key Points:**
- **Auto-Setup**: No manual configuration needed - the database creates itself on first run
- **Persistent Storage**: Information is saved between service restarts
- **File Location**: All data files are stored in `verification-service/db/`

**For Production Use:** Make sure the database folder has proper security permissions and set up regular backups of the data files.

## Testing and Production Modes

The service can operate in different environments:

**Current Setup (Real Verification):**
- Uses actual GLEIF credentials generated for each test session
- Loads real issuer information for GLEIF, QVI (Qualified vLEI Issuer), and legal entities
- Finds the correct QVI issuer by checking the generated credential files

**Credential Structure:**

Credentials include a digital signature for verification:

```json
{
  "v": "ACDC10JSON...",
  "d": "...",
  "i": "<subject aid>",
  "s": "<schema said>",
  "a": { "alsoKnownAs": ["did:iota:..."] },
  "p": { "d": "<signature qb64>" }
}
```

**Testing Workflow:**

1. Create test credentials (saved to `gleif-frontend/public/.well-known/keri/`)
2. Set the GLEIF root identifier from the setup file
3. Restart the verification service to load new credentials
4. Send the legal entity credential to the `/verify` endpoint for checking

**For Production Deployment:**

1. Use the official GLEIF root identifier
2. Load real issuer credentials and keys into the database
3. Import the complete chain of trust credentials

## Detailed Verification Steps

The service checks credentials through a 5-step process:

```
1. Check Format → 2. Find Issuer → 3. Verify Signatures → 4. Follow Chain → 5. Confirm GLEIF Trust
```

1. **Format Check**: Makes sure the credential has all required fields and is properly structured
2. **Issuer Lookup**: Finds and validates the entity that issued the credential
3. **Signature Check**: Confirms all digital signatures are authentic and valid
4. **Chain Verification**: Traces the credential's path from the legal entity through QVI to GLEIF
5. **GLEIF Confirmation**: Ensures the credential ultimately comes from GLEIF's trusted root authority

## Technical Requirements

The service relies on these main components:

- **Flask**: Web framework for handling API requests
- **KERI**: Protocol implementation for secure identity and credential management
- **python-dotenv**: Manages configuration settings from environment files
- **requests**: Handles external web service calls

## System Integration

This verification service works with the Node.js backend system for credential checking. It can run as a separate service and be scaled independently based on verification demand.
