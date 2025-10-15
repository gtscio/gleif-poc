import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const keriDir = path.join(process.cwd(), "public", ".well-known", "keri");
    const saidFilePath = path.join(keriDir, "credential-said.txt");

    if (!fs.existsSync(saidFilePath)) {
      return NextResponse.json(
        { error: "Credential SAID file not found" },
        { status: 404 }
      );
    }

    const credentialSaid = fs.readFileSync(saidFilePath, "utf-8").trim();
    const credentialPath = path.join(keriDir, credentialSaid);

    if (!fs.existsSync(credentialPath)) {
      return NextResponse.json(
        { error: "Credential file not found" },
        { status: 404 }
      );
    }

    const credential = JSON.parse(fs.readFileSync(credentialPath, "utf-8"));

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Error serving credential:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
