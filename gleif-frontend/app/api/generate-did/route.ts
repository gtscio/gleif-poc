import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  if (process.env.VERCEL) {
    return NextResponse.json({
      success: false,
      message:
        "DID generation is not available in the deployed environment. Please run locally for development purposes.",
    });
  }

  try {
    // Step 1: Call twin-service to create a new DID
    const twinServiceResponse = await fetch(
      "http://localhost:3001/create-did",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!twinServiceResponse.ok) {
      throw new Error(`Twin service error: ${twinServiceResponse.status}`);
    }

    const twinResult = await twinServiceResponse.json();
    if (!twinResult.success) {
      throw new Error(twinResult.error || "Failed to create DID");
    }

    const newDid = twinResult.did.id;
    console.log("✅ New DID created:", newDid);

    // Step 2: Generate KERI credentials using the script
    const scriptPath = "../did-management/generate-credentials.sh";
    const { stdout, stderr } = await execAsync(`${scriptPath} "${newDid}"`, {
      cwd: process.cwd(), // Run from the current working directory (gleif-frontend)
    });

    if (stderr) {
      console.warn("Script stderr:", stderr);
    }

    console.log("✅ Credentials generated:", stdout);

    return NextResponse.json({
      success: true,
      did: newDid,
      message: "DID created and KERI credentials generated successfully",
    });
  } catch (error) {
    console.error("[API Handler] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `An internal error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
