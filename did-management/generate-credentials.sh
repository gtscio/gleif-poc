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
echo "--- Creating Placeholder Signed Credential ---"
mkdir -p $OUTPUT_DIR/icp

# Simulates the KERI Inception Configuration File for the Legal Entity.
echo '{"v":"KERI10JSON00011c_","i":"'$LE_AID_FILENAME'","s":"0","t":"icp",...}' > "$OUTPUT_DIR/icp/$LE_AID_FILENAME"

# Simulates the "Designated Aliases" ACDC file with the reverse link.
echo '{
    "v": "ACDC10JSON00017a_",
    "d": "'$CRED_FILENAME'",
    "i": "'$LE_AID_FILENAME'",
    "s": "'$SCHEMA_SAID'",
    "a": { "alsoKnownAs": ["'$LIVE_IOTA_DID'"] },
    "p": { "d": "SIGNATURE_SAID" }
}' > "$OUTPUT_DIR/$CRED_FILENAME"

echo "✅ Placeholder cryptographic files created in ${OUTPUT_DIR}"

# --- Path 2: Domain Linkage Configuration ---
echo "--- Generating DID Configuration for Domain Linkage Path ---"
node "$SCRIPT_DIR/create-domain-linkage.js" "http://localhost:3000" "$DOMAIN_CONFIG_PATH"