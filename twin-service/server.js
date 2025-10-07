import path from "node:path";
import * as dotenv from "dotenv";
import express from "express";
import {
  createDIDDocument,
  resolveDIDDocument,
  mintNFT,
  transferNFT,
} from "./lib/twin-utils.ts";

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
    const { document, address } = await createDIDDocument();
    res.json({ success: true, did: document, address });
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
    const { issuerAddress, immutableData, metadata } = req.body;
    if (!issuerAddress || !immutableData) {
      return res.status(400).json({
        success: false,
        error: "issuerAddress and immutableData are required",
      });
    }
    const nft = await mintNFT(issuerAddress, immutableData, metadata);
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

app.listen(3001, () => {
  console.log("Twin Service running on port 3001");
});
