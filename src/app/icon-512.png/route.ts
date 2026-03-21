import { NextResponse } from "next/server";

export async function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#000000"/>
  <text x="256" y="196" font-family="Arial Black,sans-serif" font-size="140" font-weight="900" fill="#ffffff" text-anchor="middle">PPP</text>
  <text x="256" y="356" font-family="Arial Black,sans-serif" font-size="140" font-weight="900" fill="#FF007A" text-anchor="middle">TV</text>
</svg>`;
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" }
  });
}
