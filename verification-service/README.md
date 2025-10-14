# KERI ACDC Verification Service

A Python Flask service that performs full cryptographic verification of KERI ACDC (Authentic Chained Data Container) credentials, replicating the verification logic of the "Sally" verifier in the GLEIF vLEI workflow.

## Features

- **Full Chain Verification**: Validates the complete issuance chain from Legal Entity → QVI → GLEIF
- **Cryptographic Validation**: Verifies all signatures in the KERI event log
- **GLEIF Root Trust**: Confirms credentials trace back to the trusted GLEIF AID
- **REST API**: Simple HTTP endpoints for credential verification
- **Comprehensive Logging**: Detailed logs for debugging and monitoring

## API Endpoints

### POST /verify

Verify a KERI ACDC credential.

**Request Body:**

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

**Response (Success):**

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

**Response (Failure):**

```json
{
  "success": false,
  "verified": false,
  "error": "Verification failed: [reason]",
  "details": {...}
}
```

### GET /health

Health check endpoint.

## Installation

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:

```bash
PORT=5001
GLEIF_ROOT_AID=GLEIF_ROOT_AID_SIMULATED
LOG_LEVEL=INFO
```

### Configuration Details

- **PORT**: The port number the service listens on (default: 5000)
- **GLEIF_ROOT_AID**: The root AID for GLEIF trust anchor. Use `GLEIF_ROOT_AID_SIMULATED` for testing or the actual GLEIF AID for production
- **LOG_LEVEL**: Logging verbosity level (DEBUG, INFO, WARNING, ERROR)

3. Set the trusted GLEIF root AID from the generated inception file for this run:

```bash
export GLEIF_ROOT_AID=$(jq -r '.i' ../gleif-frontend/public/.well-known/keri/gleif-incept.json)
```

4. Run the service:

```bash
python app.py
```

## Database Setup

The verification service uses a persistent KERI database to store issuer key states. The database is automatically initialized on startup in the `./db` directory relative to the service root.

- **Automatic Initialization**: The service creates the database directory and initializes the Baser database when started.
- **Persistence**: The database persists across restarts, allowing the service to maintain verification state.
- **Location**: Database files are stored in `verification-service/db/`.

For production deployments, ensure the database directory has appropriate permissions and consider backup strategies for the database files.

## Real vs Simulated Operations

The verification service supports both simulated and real KERI operations:

- **Simulated Mode**: Deprecated. This service now verifies real credentials generated for each test run.
- **Real Mode** (current behavior):
  - Set `GLEIF_ROOT_AID` from the generated `gleif-incept.json` (`.i` field) before starting.
  - The service loads inception events for GLEIF, QVI, and Legal Entity. Issuer discovery uses the generated `qvi-credential.json` to determine the QVI AID that authorized the Legal Entity credential.
  - For deterministic tests, restart this service after credentials are generated so it boots with the fresh artifacts.

### Credential Format

Generated credentials store the signature as a single object at `p.d` (not an array), for example:

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

### Recommended Test Flow

1. Generate credentials (writes files under `gleif-frontend/public/.well-known/keri/`).
2. Export `GLEIF_ROOT_AID` from `gleif-incept.json`.
3. Restart the verification service to load the new artifacts.
4. POST the generated `legal-entity-credential.json` to `/verify`.

To switch from simulated to real operations:

1. Set `GLEIF_ROOT_AID` to the actual GLEIF root AID
2. Ensure the KERI database contains real issuer credentials and key states
3. Populate the database with the full issuance chain credentials

## Verification Process

The service performs verification in 5 steps:

1. **Structure Validation**: Ensures the credential has required ACDC fields
2. **Resolution**: Resolves the credential and its issuer AID
3. **Signature Validation**: Verifies cryptographic signatures in the event log
4. **Chain Traversal**: Follows the issuance chain (Legal Entity → QVI → GLEIF)
5. **GLEIF Verification**: Confirms the root issuer is the trusted GLEIF AID

## Dependencies

- Flask: Web framework
- keri: KERI protocol implementation
- python-dotenv: Environment variable management
- requests: HTTP client for external calls

## Integration

This service is designed to be called by the Node.js backend for credential verification. It can be deployed independently and scaled as needed.
