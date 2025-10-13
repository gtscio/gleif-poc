#!/bin/bash

# vault-init.sh
# Automates the setup of Vault transit engine for the GLEIF PoC project.
# This script checks Vault accessibility, enables the transit secrets engine if needed,
# and creates the wallet-key for encryption operations.
#
# Prerequisites:
# - Vault CLI installed and configured
# - Vault server running and accessible
# - Appropriate Vault token or authentication set up
#
# Usage: ./vault-init.sh
# Logs are written to vault-init.log in the current directory

set -e  # Exit immediately on any error

LOG_FILE="vault-init.log"

# Logging function
log() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $message" | tee -a "$LOG_FILE"
}

# Error handling function
error_exit() {
    local message="$1"
    log "ERROR: $message"
    exit 1
}

log "Starting Vault transit engine initialization"

# Step 1: Check if Vault is running and accessible
log "Checking Vault status..."
if ! vault status >/dev/null 2>&1; then
    error_exit "Vault is not running or not accessible. Please ensure Vault is started and properly configured."
fi
log "Vault is accessible"

# Step 2: Enable transit secrets engine if not already enabled
log "Checking if transit secrets engine is enabled..."
if ! vault secrets list 2>/dev/null | grep -q "^transit/"; then
    log "Enabling transit secrets engine..."
    if ! vault secrets enable transit 2>/dev/null; then
        error_exit "Failed to enable transit secrets engine"
    fi
    log "Transit secrets engine enabled successfully"
else
    log "Transit secrets engine is already enabled"
fi

# Step 3: Create wallet-key for encryption operations
log "Creating wallet-key..."
if ! vault write -f transit/keys/wallet-key 2>/dev/null; then
    error_exit "Failed to create wallet-key"
fi
log "wallet-key created successfully"

log "Vault transit engine initialization completed successfully"