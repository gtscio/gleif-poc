import { NextRequest, NextResponse } from "next/server";
import { verifyLinkage } from "../../lib/verifier";

export async function POST(request: NextRequest) {
  try {
    const { did: iotaDid } = await request.json();
    if (!iotaDid) {
      return NextResponse.json(
        { status: "NOT VERIFIED", reason: "IOTA DID not provided." },
        { status: 400 }
      );
    }

    const result = await verifyLinkage(iotaDid);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API Handler] Error:", error);
    return NextResponse.json(
      { status: "ERROR", reason: `An internal error occurred: ${error}` },
      { status: 500 }
    );
  }
}
