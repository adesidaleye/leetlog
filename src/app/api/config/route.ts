import { NextResponse } from "next/server";

export async function GET() {
  const hasTwitter = !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_TOKEN_SECRET
  );

  return NextResponse.json({ hasTwitter });
}
