import { NextRequest, NextResponse } from "next/server";

const SLEEPER_BASE = "https://api.sleeper.app/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Whitelist valid Sleeper paths
  const validPaths = [
    /^\/state\/nfl$/,
    /^\/user\/[^/]+$/,
    /^\/user\/[^/]+\/leagues\/nfl\/\d{4}$/,
    /^\/league\/[^/]+$/,
    /^\/league\/[^/]+\/rosters$/,
    /^\/league\/[^/]+\/users$/,
    /^\/league\/[^/]+\/drafts$/,
    /^\/draft\/[^/]+\/picks$/,
    /^\/league\/[^/]+\/matchups\/\d+$/,
    /^\/league\/[^/]+\/transactions\/\d+$/,
    /^\/players\/nfl\/trending\/add$/,
    /^\/players\/nfl$/,
  ];

  const isValid = validPaths.some((pattern) => pattern.test(path.split("?")[0]));
  if (!isValid) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const url = `${SLEEPER_BASE}${path}`;
    const isPlayersEndpoint = path === "/players/nfl";
    const res = await fetch(url, {
      headers: { "User-Agent": "SleeperFantasyIntel/1.0" },
      next: { revalidate: isPlayersEndpoint ? 86400 : 60 }, // players: 24h, rest: 60s
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Sleeper API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("Sleeper proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch from Sleeper" }, { status: 500 });
  }
}
