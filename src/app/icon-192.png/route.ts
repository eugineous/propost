import { NextResponse } from "next/server";

// Returns a simple SVG icon as PNG-compatible response
// For a real app you'd use a proper PNG — this SVG works for PWA install
export async function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="32" fill="#000000"/>
  <text x="96" y="72" font-family="Arial Black,sans-serif" font-size="52" font-weight="900" fill="#ffffff" text-anchor="middle">PPP</text>
  <text x="96" y="132" font-family="Arial Black,sans-serif" font-size="52" font-weight="900" fill="#FF007A" text-anchor="middle">TV</text>
</svg>`;
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" }
  });
}
