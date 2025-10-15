#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export LIVE_IOTA_DID="$1"
if [[ -z "$LIVE_IOTA_DID" ]]; then
    echo "❌ ERROR: Please provide a DID as the first argument."
    exit 1
fi
export LE_AID_FILENAME="Eabc123_placeholder_legal_entity_aid"
export SCHEMA_SAID="E123_SCHEMA_ID_PLACEHOLDER"
export CRED_FILENAME="Edef456_placeholder_credential_said"
export OUTPUT_DIR="$SCRIPT_DIR/../gleif-frontend/public/.well-known/keri"
export DOMAIN_CONFIG_PATH="$SCRIPT_DIR/../gleif-frontend/public/.well-known/did-configuration.json"

echo "--- Starting Real Credential Generation ---"

echo "✅ Using IOTA DID: $LIVE_IOTA_DID"
echo "--- Creating Real Signed Credential ---"
mkdir -p $OUTPUT_DIR/icp

# Activate the virtual environment and call Python script to generate real KERI ACDC credentials
source "$SCRIPT_DIR/venv/bin/activate" && python3 "$SCRIPT_DIR/generate-credentials.py" "$LIVE_IOTA_DID"

echo "✅ Real cryptographic files created in ${OUTPUT_DIR}"

# --- Path 2: Domain Linkage Configuration ---
echo "--- Generating DID Configuration for Domain Linkage Path ---"
node "$SCRIPT_DIR/create-domain-linkage.js" "http://localhost:3000" "$DOMAIN_CONFIG_PATH"