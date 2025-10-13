import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { did, verificationType } = await request.json();
    if (!did || !verificationType) {
      return NextResponse.json(
        {
          status: "NOT VERIFIED",
          reason: "DID or verificationType not provided.",
        },
        { status: 400 }
      );
    }

    const backendResponse = await fetch("http://localhost:3001/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did, verificationType }),
    });

    if (!backendResponse.ok) {
      return NextResponse.json(
        { status: "ERROR", reason: "Backend verification failed." },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API Handler] Error:", error);
    return NextResponse.json(
      { status: "ERROR", reason: `An internal error occurred: ${error}` },
      { status: 500 }
    );
  }
}
