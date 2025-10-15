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
      let reason = "Verification failed due to an unknown backend error.";
      try {
        const errorData = await backendResponse.json();
        if (errorData && errorData.error) {
          reason = errorData.error;
        } else if (errorData && errorData.message) {
          reason = errorData.message;
        }
      } catch (parseError) {
        // If we can't parse the response body, fall back to status-based messages
        console.warn(
          "[API Handler] Could not parse error response body:",
          parseError
        );
      }

      // Fallback to status-based messages if no specific error was found
      if (reason === "Verification failed due to an unknown backend error.") {
        switch (backendResponse.status) {
          case 400:
            reason =
              "Invalid verification request. Please check your DID and verification type.";
            break;
          case 401:
            reason = "Unauthorized access to verification service.";
            break;
          case 404:
            reason = "DID not found or verification type not supported.";
            break;
          case 500:
            reason =
              "Internal error in verification service. Please try again later.";
            break;
          case 503:
            reason =
              "Verification service is temporarily unavailable. Please try again later.";
            break;
          default:
            reason = `Backend verification failed with status ${backendResponse.status}.`;
        }
      }

      return NextResponse.json(
        { status: "ERROR", reason },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    // Ensure top-level status for test compatibility while preserving original shape
    const topLevelStatus =
      (result?.result && result.result.status) || result?.status || "OK";
    return NextResponse.json({ ...result, status: topLevelStatus });
  } catch (error) {
    console.error("[API Handler] Error:", error);
    let reason = "An unexpected error occurred during verification.";
    if (error instanceof TypeError) {
      reason = "Network error: Unable to reach the verification service.";
    } else if (error instanceof SyntaxError) {
      reason = "Invalid response format from verification service.";
    } else {
      reason = "An internal server error occurred.";
    }
    return NextResponse.json({ status: "ERROR", reason }, { status: 500 });
  }
}
