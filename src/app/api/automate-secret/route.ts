import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ secret: process.env.AUTOMATE_SECRET || "" });
}
