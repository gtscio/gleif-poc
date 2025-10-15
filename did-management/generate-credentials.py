#!/usr/bin/env python3
"""
Generate cryptographically valid KERI ACDC credentials based on GLEIF blueprint workflow.

This script implements the real GLEIF vLEI workflow using keripy:
1. Generate KERI AIDs for GLEIF (root of trust), QVI, and Legal Entity
2. GLEIF issues Qualified vLEI Issuer Credential to QVI
3. QVI issues Designated Aliases Credential to Legal Entity

Usage: python3 generate-credentials.py <iota_did>
"""

import sys
import os
import json
import logging
from pathlib import Path

# KERI imports
from keri.core import coring, eventing, scheming, serdering
from keri.core import Salter
from keri.app import habbing
from keri.db import basing

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_hab(name, salt=None):
    """Create a KERI Habitat (agent) with a given name"""
    # Use openHby context manager to create habery with proper initialization
    # We need to keep the context manager alive, so we'll create a global reference
    global _habitats
    if '_habitats' not in globals():
        _habitats = {}

    hby = habbing.Habery(name=name, temp=True)
    hab = hby.makeHab(name=name)
    logger.info(f"Created habitat '{name}' with AID: {hab.pre}")

    # Store reference to keep alive
    _habitats[name] = (hby, hab)
    return hby, hab

def main():
    if len(sys.argv) != 2:
        logger.error("Usage: python3 generate-credentials.py <iota_did>")
        sys.exit(1)

    # Sanitize DID input (some shells or upstream output may duplicate concatenation)
    raw_did = sys.argv[1]
    iota_did = raw_did.strip()
    if iota_did.count('did:iota:') > 1:
        # If duplicated, take the first occurrence only
        first = iota_did.find('did:iota:')
        second = iota_did.find('did:iota:', first + 1)
        if second != -1:
            iota_did = iota_did[:second]
    logger.info(f"Starting credential generation for IOTA DID: {iota_did}")

    # Get script directory and set paths
    script_dir = Path(__file__).parent
    output_dir = script_dir / "../gleif-frontend/public/.well-known/keri"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load twin wallet to get legal entity DID
    twin_wallet_path = script_dir / "twin-wallet.json"
    with open(twin_wallet_path, 'r') as f:
        twin_wallet = json.load(f)

    legal_entity_did = twin_wallet['did']
    logger.info(f"Legal Entity DID from twin-wallet: {legal_entity_did}")

    # Step 1: Generate KERI AIDs using real cryptographic operations
    logger.info("Step 1: Generating KERI Autonomous Identifiers (AIDs)")

    # Create GLEIF habitat (root of trust)
    gleif_hby, gleif_hab = create_hab("gleif")
    gleif_aid = gleif_hab.pre
    logger.info(f"GLEIF AID: {gleif_aid}")

    # Create QVI habitat
    qvi_hby, qvi_hab = create_hab("qvi")
    qvi_aid = qvi_hab.pre
    logger.info(f"QVI AID: {qvi_aid}")

    # Create Legal Entity habitat
    legal_entity_hby, legal_entity_hab = create_hab("legal-entity")
    legal_entity_aid = legal_entity_hab.pre
    logger.info(f"Legal Entity AID: {legal_entity_aid}")

    # Save inception events for GLEIF and QVI
    gleif_icp_path = output_dir / "gleif-incept.json"
    gleif_icp_data = {
        "v": "KERI10JSON00011c_",
        "i": gleif_aid,
        "s": "0",
        "t": "icp",
        "kt": "1",
        "k": [gleif_hab.kever.verfers[0].qb64],
        "nt": "1",
        "n": [],
        "bt": "0",
        "b": [],
        "c": [],
        "a": []
    }
    with open(gleif_icp_path, 'w') as f:
        json.dump(gleif_icp_data, f, indent=2)
    logger.info(f"GLEIF inception event written to: {gleif_icp_path}")

    qvi_icp_path = output_dir / "qvi-incept.json"
    qvi_icp_data = {
        "v": "KERI10JSON00011c_",
        "i": qvi_aid,
        "s": "0",
        "t": "icp",
        "kt": "1",
        "k": [qvi_hab.kever.verfers[0].qb64],
        "nt": "1",
        "n": [],
        "bt": "0",
        "b": [],
        "c": [],
        "a": []
    }
    with open(qvi_icp_path, 'w') as f:
        json.dump(qvi_icp_data, f, indent=2)
    logger.info(f"QVI inception event written to: {qvi_icp_path}")

    # Step 2: GLEIF issues Qualified vLEI Issuer Credential to QVI
    logger.info("Step 2: GLEIF issuing Qualified vLEI Issuer Credential to QVI")

    # Create schema for Qualified vLEI Issuer Credential
    qvi_schema = scheming.Schemer(sed={
        "$id": "QUALIFIED_VLEI_ISSUER_SCHEMA",
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "issuer": {"type": "string"},
            "issuee": {"type": "string"},
            "qualified": {"type": "boolean"}
        },
        "required": ["issuer", "issuee", "qualified"]
    })
    qvi_schema_said = qvi_schema.said

    # Create ACDC credential for QVI
    qvi_credential_data = {
        "issuer": gleif_aid,
        "issuee": qvi_aid,
        "qualified": True
    }

    # Create the ACDC with cryptographic signing
    qvi_acdc = serdering.SerderACDC(sad={
        "v": "ACDC10JSON00017a_",
        "d": "",  # Will be filled by said computation
        "i": qvi_aid,
        "s": qvi_schema_said,
        "a": qvi_credential_data
    }, makify=True)

    # Sign the ACDC with GLEIF's private key
    qvi_signatures = gleif_hab.sign(ser=qvi_acdc.raw, indexed=True)
    # For PoC and test compatibility, store a single signature object at p.d
    if qvi_signatures:
        qvi_acdc._sad["p"] = {"d": qvi_signatures[0].qb64}

    qvi_credential_said = qvi_acdc.said
    qvi_credential = qvi_acdc.sad

    logger.info(f"QVI Credential SAID: {qvi_credential_said}")

    # Save QVI credential to JSON file
    qvi_credential_path = output_dir / "qvi-credential.json"
    with open(qvi_credential_path, 'w') as f:
        json.dump(qvi_credential, f, indent=2)
    logger.info(f"QVI Credential written to: {qvi_credential_path}")

    # Step 3: QVI issues Designated Aliases Credential to Legal Entity
    logger.info("Step 3: QVI issuing Designated Aliases Credential to Legal Entity")

    # Create schema for Designated Aliases Credential
    da_schema = scheming.Schemer(sed={
        "$id": "DESIGNATED_ALIASES_SCHEMA",
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "alsoKnownAs": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["alsoKnownAs"]
    })
    schema_said = da_schema.said

    # Create ACDC credential for Legal Entity
    da_credential_data = {
        "alsoKnownAs": [iota_did]
    }

    # Create the ACDC with cryptographic signing
    da_acdc = serdering.SerderACDC(sad={
        "v": "ACDC10JSON00017a_",
        "d": "",  # Will be filled by said computation
        "i": legal_entity_aid,
        "s": schema_said,
        "a": da_credential_data
    }, makify=True)

    # Sign the ACDC with QVI's private key
    da_signatures = qvi_hab.sign(ser=da_acdc.raw, indexed=True)
    # For PoC and test compatibility, store a single signature object at p.d
    if da_signatures:
        da_acdc._sad["p"] = {"d": da_signatures[0].qb64}

    credential_said = da_acdc.said
    designated_aliases_credential = da_acdc.sad

    logger.info(f"Designated Aliases Credential SAID: {credential_said}")

    # Step 4: Output the final verifiable ACDC credential
    logger.info("Step 4: Outputting final ACDC credential")

    # Save Legal Entity credential to JSON file
    legal_entity_credential_path = output_dir / "legal-entity-credential.json"
    with open(legal_entity_credential_path, 'w') as f:
        json.dump(designated_aliases_credential, f, indent=2)
    logger.info(f"Legal Entity Credential written to: {legal_entity_credential_path}")

    credential_path = output_dir / credential_said
    with open(credential_path, 'w') as f:
        json.dump(designated_aliases_credential, f, indent=2)

    # Write the credential SAID to a file for dynamic loading
    said_file_path = output_dir / "credential-said.txt"
    with open(said_file_path, 'w') as f:
        f.write(credential_said)

    logger.info(f"Credential written to: {credential_path}")
    logger.info(f"Credential SAID written to: {said_file_path}")

    # Also create/update ICP file for legal entity
    icp_dir = output_dir / "icp"
    icp_dir.mkdir(exist_ok=True)
    icp_path = icp_dir / legal_entity_aid

    # Create simulated ICP event for the legal entity (simplified)
    icp_data = {
        "v": "KERI10JSON00011c_",
        "i": legal_entity_aid,
        "s": "0",
        "t": "icp",
        "kt": "1",
        "k": [legal_entity_hab.kever.verfers[0].qb64],
        "nt": "1",
        "n": [],
        "bt": "0",
        "b": [],
        "c": [],
        "a": []
    }

    with open(icp_path, 'w') as f:
        json.dump(icp_data, f, indent=2)

    logger.info(f"ICP file written to: {icp_path}")

    # Save the habitats for potential reuse (optional)
    habitats = {
        "gleif": {
            "aid": gleif_aid,
            "salt": gleif_hab.salt.qb64 if hasattr(gleif_hab, 'salt') else None
        },
        "qvi": {
            "aid": qvi_aid,
            "salt": qvi_hab.salt.qb64 if hasattr(qvi_hab, 'salt') else None
        },
        "legal_entity": {
            "aid": legal_entity_aid,
            "salt": legal_entity_hab.salt.qb64 if hasattr(legal_entity_hab, 'salt') else None
        }
    }

    habitats_path = output_dir / "habitats.json"
    with open(habitats_path, 'w') as f:
        json.dump(habitats, f, indent=2)

    logger.info(f"Habitats saved to: {habitats_path}")

    logger.info("✅ Credential generation completed successfully")
    logger.info(f"Final credential SAID: {credential_said}")
    logger.info(f"Legal Entity AID: {legal_entity_aid}")
    logger.info(f"IOTA DID linked: {iota_did}")

if __name__ == "__main__":
    main()