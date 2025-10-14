import path from "node:path";
import * as dotenv from "dotenv";
import express from "express";
import {
  createDIDDocument,
  resolveDIDDocument,
  mintNFT,
  transferNFT,
  upsertLinkedDomainsService,
  createDomainLinkageCredential,
} from "./lib/twin-utils.ts";
import { verifyLinkage } from "./lib/verifier.js";

dotenv.config({
  path: [
    path.resolve(".env"),
    path.resolve(".env.local"),
    path.resolve(".env.vault"),
  ],
  quiet: true,
});

// Enable real IOTA testnet operations

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Twin Service!");
});

// POST /create-did
app.post("/create-did", async (req, res) => {
  try {
    const { controller, domainOrigin } = req.body;
    const {
      document,
      address,
      controllerIdentity,
      defaultVerificationMethodId,
    } = await createDIDDocument(controller, domainOrigin);
    res.json({
      success: true,
      did: document,
      address,
      controllerIdentity,
      verificationMethodId: defaultVerificationMethodId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /resolve-did/:did
app.get("/resolve-did/:did", async (req, res) => {
  try {
    const { did } = req.params;
    const didDocument = await resolveDIDDocument(did);
    res.json({ success: true, didDocument });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /mint-nft
app.post("/mint-nft", async (req, res) => {
  try {
    const { controller, issuerAddress, immutableData, metadata } = req.body;
    if (!issuerAddress || !immutableData) {
      return res.status(400).json({
        success: false,
        error: "issuerAddress and immutableData are required",
      });
    }
    const nft = await mintNFT(
      controller,
      issuerAddress,
      immutableData,
      metadata
    );
    res.json({ success: true, nft });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /transfer-nft
app.post("/transfer-nft", async (req, res) => {
  try {
    const { nftId, toAddress, fromAddress, amount } = req.body;
    if (!nftId || !toAddress || !fromAddress) {
      return res.status(400).json({
        success: false,
        error: "nftId, toAddress, and fromAddress are required",
      });
    }
    await transferNFT(nftId, toAddress, fromAddress, amount);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /verify
app.post("/verify", async (req, res) => {
  try {
    const { did, verificationType } = req.body;
    if (!did || !verificationType) {
      return res.status(400).json({
        success: false,
        error: "did and verificationType are required",
      });
    }
    const result = await verifyLinkage(did, verificationType);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /link-domain
app.post("/link-domain", async (req, res) => {
  try {
    const { did, controllerIdentity, domainOrigin } = req.body;
    if (!did || !controllerIdentity || !domainOrigin) {
      return res.status(400).json({
        success: false,
        error: "did, controllerIdentity, and domainOrigin are required",
      });
    }
    const service = await upsertLinkedDomainsService(
      controllerIdentity,
      did,
      domainOrigin
    );
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /domain-credential
app.post("/domain-credential", async (req, res) => {
  try {
    const { controllerIdentity, verificationMethodId, domainOrigin, id } =
      req.body;
    if (!controllerIdentity || !verificationMethodId || !domainOrigin) {
      return res.status(400).json({
        success: false,
        error:
          "controllerIdentity, verificationMethodId, and domainOrigin are required",
      });
    }

    const { jwt, credential } = await createDomainLinkageCredential(
      controllerIdentity,
      verificationMethodId,
      domainOrigin,
      id
    );

    res.json({ success: true, jwt, credential });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, () => {
  console.log("Twin Service running on port 3001");
});
