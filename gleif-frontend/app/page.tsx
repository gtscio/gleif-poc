"use client";

import { useState } from "react";
import {
  generateExplorerLink,
  getAddressExplorerUrl,
  openExplorerUrl,
} from "../lib/explorer-utils";

export default function Home() {
  const [didToVerify, setDidToVerify] = useState("did:iota:1234567890abcdef");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blockchainData, setBlockchainData] = useState<{
    originalDid?: string;
    attestationDid?: string;
    nftId?: string;
    issuerAddress?: string;
  }>({});

  const handleVerify = async () => {
    setIsLoading(true);
    setVerificationStatus(null);
    setReason("");
    setBlockchainData({});
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: didToVerify }),
      });
      const result = await response.json();
      setVerificationStatus(result.status);
      setReason(result.reason || "");
      setBlockchainData({
        originalDid: result.originalDid,
        attestationDid: result.attestationDid,
        nftId: result.nftId,
        issuerAddress: result.issuerAddress,
      });
    } catch (error) {
      setVerificationStatus("ERROR");
      setReason("Failed to connect to the verifier service.");
      console.log("Verification error:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            vLEI ↔ TWIN ID Linkage Verifier
          </h1>
          <p className="text-gray-600">
            This PoC demonstrates the end-to-end verification flow using a live
            TWIN ID.
          </p>
        </header>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Verify a Linkage</h2>
          <p className="text-gray-700 mb-4">
            Enter the live TWIN ID you created to verify its bi-directional link
            to a vLEI.
          </p>
          <div className="mb-4">
            <label
              htmlFor="did-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              TWIN Decentralized Identifier
            </label>
            <input
              id="did-input"
              type="text"
              value={didToVerify}
              onChange={(e) => setDidToVerify(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={isLoading || !didToVerify}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Verifying..." : "Verify Linkage"}
          </button>
        </div>
        {verificationStatus && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              verificationStatus === "VERIFIED"
                ? "bg-green-100 border border-green-400"
                : verificationStatus === "NOT VERIFIED"
                ? "bg-red-100 border border-red-400"
                : "bg-yellow-100 border border-yellow-400"
            }`}
          >
            <h2 className="text-lg font-semibold mb-2">Verification Result</h2>
            <div className="text-xl font-bold mb-1">
              {verificationStatus === "VERIFIED" && "✅ VERIFIED"}
              {verificationStatus === "NOT VERIFIED" && "❌ NOT VERIFIED"}
              {verificationStatus === "ERROR" && "🔥 ERROR"}
            </div>
            {reason && <p className="text-gray-700">{reason}</p>}
            {verificationStatus === "VERIFIED" && (
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  Blockchain Explorer Links
                </h3>
                <div className="space-y-1">
                  {blockchainData.originalDid && (
                    <button
                      onClick={() =>
                        openExplorerUrl(
                          generateExplorerLink(blockchainData.originalDid!)
                        )
                      }
                      className="block w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      🔗 View Original DID Document
                    </button>
                  )}
                  {blockchainData.attestationDid && (
                    <button
                      onClick={() =>
                        openExplorerUrl(
                          generateExplorerLink(blockchainData.attestationDid!)
                        )
                      }
                      className="block w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      🔗 View Attestation DID Document
                    </button>
                  )}
                  {blockchainData.nftId && (
                    <button
                      onClick={() =>
                        openExplorerUrl(
                          generateExplorerLink(blockchainData.nftId!)
                        )
                      }
                      className="block w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 rounded-md text-green-700 hover:text-green-800 transition-colors"
                    >
                      🖼️ View NFT Attestation
                    </button>
                  )}
                  {blockchainData.issuerAddress && (
                    <button
                      onClick={() =>
                        openExplorerUrl(
                          getAddressExplorerUrl(blockchainData.issuerAddress!)
                        )
                      }
                      className="block w-full text-left px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-md text-purple-700 hover:text-purple-800 transition-colors"
                    >
                      👛 View Issuer Wallet Address
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
