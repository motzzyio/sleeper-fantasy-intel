"use client";
import { useState, useEffect } from "react";
import { Card, SectionTitle, AIBox, AIInput, Spinner } from "./ui";
import { useIsMobile } from "@/lib/useIsMobile";
import { askAI, askAIWithSearch } from "@/lib/api";
import type {
  League, Roster, LeagueUser, Matchup, Transaction,
  TrendingPlayer, NFLState, PlayerMap,
} from "@/lib/types";

interface Props {
  league: League;
  rosters: Roster[];
  leagueUsers: LeagueUser[];
  matchups: Matchup[];
  transactions: Transaction[];
  trending: TrendingPlayer[];
  nflState: NFLState;
  userId: string;
  playerMap: PlayerMap;
}

const MODES = [
  { id: "waiver",   label: "🔄 Waivers" },
  { id: "startsit", label: "📋 Start / Sit" },
  { id: "trade",    label: "↔️ Trades" },
  { id: "injury",   label: "🏥 Injuries & Byes" },
];

const TX_COLOR: Record<string, { bg: string; text: string }> = {
  trade:      { bg: "#e74c3c22", text: "var(--red)" },
  waiver:     { bg: "#27ae6022", text: "var(--green)" },
  free_agent: { bg: "#2980b922", text: "var(--blue)" },
};

export default function InSeasonTab({
  league, rosters, leagueUsers, matchups, transactions,
  trending, nflState, userId, playerMap,
}: Props) {
  const isMobile = useIsMobile();
  const [query, setQuery]             = useState("");
  const [aiText, setAiText]           = useState("");
  const [busy, setBusy]               = useState(false);
  const [mode, setMode]               = useState("waiver");
  const [proactiveText, setProactive] = useState("");
  const [proactiveBusy, setProactiveBusy] = useState(false);
  const [proactiveLoaded, setProactiveLoaded] = useState(false);

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const uMap: Record<string, string> = {};
  leagueUsers.forEach(u => { uMap[u.user_id] = u.display_name || u.username; });

  const rosterToOwner: Record<number, string> = {};
  rosters.forEach(r => { rosterToOwner[r.roster_id] = uMap[r.owner_id] || `Team ${r.roster_id}`; });

  const myRoster   = rosters.find(r => r.owner_id === userId);
  const myMatchup  = myRoster ? matchups.find(m => m.roster_id === myRoster.roster_id) : null;
  const week       = nflState?.week || 1;

  const opponentMatchup = myMatchup
    ? matchups.find(m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myMatchup.roster_id)
    : null;
  const opponentName = opponentMatchup ? rosterToOwner[opponentMatchup.roster_id] : null;

  // ── Player name resolution ─────────────────────────────────────────────────
  const playerName = (id: string): string => {
    const p = playerMap[id];
    if (!p) return id; // fallback to raw ID if not found
    const pos  = p.position ? ` (${p.position})` : "";
    const team = p.team ? ` · ${p.team}` : "";
    return `${p.first_name} ${p.last_name}${pos}${team}`;
  };

  const playerNameShort = (id: string): string => {
    const p = playerMap[id];
    if (!p) return id;
    return `${p.first_name} ${p.last_name}`;
  };

  // Injury badge for trending players
  const injuryBadge = (id: string): string | null => {
    const p = playerMap[id];
    if (!p?.injury_status) return null;
    return p.injury_status;
  };

  // ── Transaction helpers ────────────────────────────────────────────────────
  const getTxTeams = (tx: Transaction): string[] => {
    const ids = new Set<number>();
    if (tx.adds)  Object.values(tx.adds).forEach(id => ids.add(id as number));
    if (tx.drops) Object.values(tx.drops).forEach(id => ids.add(id as number));
    tx.roster_ids?.forEach(id => ids.add(id));
    return Array.from(ids).map(id => rosterToOwner[id] || `Team ${id}`);
  };

  // ── Build roster context for AI (names, not IDs) ───────────────────────────
  const myRosterNames = (myRoster?.players || []).map(id => playerName(id)).join(", ");
  const myStarterNames = (myRoster?.starters || []).map(id => playerName(id)).join(", ");

  // ── Proactive AI — fires on mount with web search ─────────────────────────
  useEffect(() => {
    if (!myRoster || proactiveLoaded) return;
    runProactive();
  }, [myRoster?.roster_id]);

  const runProactive = async () => {
    setProactiveBusy(true);
    setProactive("");
    const sc = league.scoring_settings;

    const system = `You are a proactive fantasy football advisor with access to live web search. 
Search for current NFL injury reports, waiver wire rankings, and start/sit advice for Week ${week}.
Then give the user 3–5 specific, prioritised action items they should take THIS WEEK based on their actual roster.
Format as numbered action items. Each should have a clear action verb (Add, Drop, Start, Sit, Trade for, etc).
Keep it under 350 words. Be direct and specific — mention real player names.`;

    const prompt = `My fantasy league: ${league.name} | Week ${week} | PPR:${sc.rec ?? 0} | Teams:${league.settings.num_teams}

My current roster: ${myRosterNames || "(no player data yet)"}
My current starters: ${myStarterNames || "(no starter data yet)"}

Trending adds in my league right now: ${trending.slice(0, 8).map((t, i) => `#${i + 1} ${playerNameShort(t.player_id)} (${t.count} adds)`).join(", ")}

Search the web for current Week ${week} injury news, waiver wire rankings, and matchup-based start/sit analysis. Then give me 3–5 specific actions I should take this week, in priority order.`;

    try {
      const res = await askAIWithSearch(system, prompt);
      setProactive(res);
    } catch {
      setProactive("Unable to load proactive suggestions. Check your API key supports web search.");
    }
    setProactiveBusy(false);
    setProactiveLoaded(true);
  };

  // ── Reactive AI (mode-based) ───────────────────────────────────────────────
  const modePrompts: Record<string, string> = {
    waiver: `Week ${week} waiver wire advice. Trending adds (last 24h): ${trending.slice(0, 10).map((t, i) => `#${i + 1} ${playerName(t.player_id)} — ${t.count} adds`).join(", ")}. My roster: ${myRosterNames}. Who should I target on waivers and who is safe to drop? Search for current week waiver wire rankings to support your answer.`,
    startsit: `Optimise my Week ${week} lineup. My current starters: ${myStarterNames}. My full roster: ${myRosterNames}. Search for Week ${week} matchup-based start/sit analysis and injury reports. Who should I start or sit? Flag any clear upgrades from my bench.`,
    trade: `Trade strategy for Week ${week}. My roster: ${myRosterNames}. Search for current player values and trade advice. Give me: (1) who to sell high on, (2) what positions to buy, (3) a specific trade target strategy.`,
    injury: `Week ${week} injury and bye planning. My roster: ${myRosterNames}. Search for the latest injury reports and bye week schedules for weeks ${week}–${week + 2}. Flag any players I need to address urgently and suggest contingency moves.`,
  };

  const runAI = async () => {
    setBusy(true);
    setAiText("");
    const sc = league.scoring_settings;
    const system = `You are a sharp fantasy football in-season manager with access to web search. Search for current Week ${week} NFL data to support your advice. Give specific, actionable recommendations. Use bullet points. Keep under 450 words.`;
    const prompt = `LEAGUE: ${league.name} | Week ${week} | PPR:${sc.rec ?? 0} | Teams:${league.settings.num_teams}\n${query ? `QUESTION: ${query}\nMy roster: ${myRosterNames}` : modePrompts[mode]}`;
    try {
      // Reactive queries also use web search for current data
      setAiText(await askAIWithSearch(system, prompt));
    } catch {
      setAiText("Error fetching AI analysis. Check your API key.");
    }
    setBusy(false);
  };

  const scoreFontSize = isMobile ? 30 : 38;

  return (
    <div className="fade-in">

      {/* Week + score */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Card style={{ margin: 0 }}>
          <SectionTitle>NFL Week</SectionTitle>
          <div style={{ fontSize: scoreFontSize, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>Wk {week}</div>
          <div style={{ color: "var(--dim)", fontSize: 11, marginTop: 4 }}>{nflState?.season} · {nflState?.season_type}</div>
        </Card>
        <Card style={{ margin: 0 }}>
          <SectionTitle>My Score</SectionTitle>
          {myMatchup
            ? <>
                <div style={{ fontSize: scoreFontSize, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
                  {myMatchup.points?.toFixed(2) || "0.00"}
                </div>
                {opponentName && (
                  <div style={{ color: "var(--dim)", fontSize: 11, marginTop: 4 }}>
                    vs {opponentName} · {opponentMatchup?.points?.toFixed(2) || "0.00"}
                  </div>
                )}
              </>
            : <div style={{ color: "var(--dim)", fontSize: 12, paddingTop: 6 }}>Not available</div>}
        </Card>
      </div>

      {/* ── Proactive Suggested Moves ────────────────────────────────────────── */}
      <Card style={{ borderColor: "var(--accent-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle>⚡ Suggested Moves — Week {week}</SectionTitle>
          {proactiveLoaded && !proactiveBusy && (
            <button onClick={runProactive} style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 6,
              padding: "4px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer",
            }}>↻ Refresh</button>
          )}
        </div>
        <p style={{ fontSize: 11, color: "var(--dim)", marginBottom: 12, lineHeight: 1.5 }}>
          Live AI analysis using current injury reports, waiver rankings and matchup data from across the web.
        </p>
        {proactiveBusy
          ? <Spinner label="Searching the web for this week's data…" />
          : proactiveText
            ? <div style={{
                fontSize: 13, lineHeight: 1.8, color: "#cdd9e5", whiteSpace: "pre-wrap",
                borderLeft: "2px solid var(--accent)", paddingLeft: 14,
              }}>
                {proactiveText}
              </div>
            : <div style={{ color: "var(--dim)", fontSize: 13 }}>Loading suggestions…</div>
        }
      </Card>

      {/* Trending — with player names */}
      {trending.length > 0 && (
        <Card>
          <SectionTitle>Trending Adds — Last 24h</SectionTitle>
          <div
            className={isMobile ? "scroll-x" : ""}
            style={{ display: "flex", flexWrap: isMobile ? "nowrap" : "wrap", gap: 6, paddingBottom: isMobile ? 4 : 0 }}
          >
            {trending.slice(0, 15).map((t, i) => {
              const p = playerMap[t.player_id];
              const inj = injuryBadge(t.player_id);
              return (
                <div key={i} style={{
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--muted)",
                  display: "flex", flexDirection: "column", gap: 2, flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 11 }}>#{i + 1}</span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>
                      {p ? `${p.first_name} ${p.last_name}` : t.player_id}
                    </span>
                    {inj && (
                      <span style={{ background: "#e74c3c33", color: "var(--red)", borderRadius: 3, padding: "0 5px", fontSize: 9, fontWeight: 700 }}>
                        {inj}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                    {p?.position && <span style={{ color: "var(--accent)", fontWeight: 600 }}>{p.position}</span>}
                    {p?.team && <span style={{ color: "var(--dim)" }}>{p.team}</span>}
                    <span style={{ color: "var(--dim)", marginLeft: "auto" }}>{t.count.toLocaleString()}×</span>
                  </div>
                </div>
              );
            })}
          </div>
          {isMobile && <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 6 }}>← scroll for more</div>}
        </Card>
      )}

      {/* Transactions with team names + resolved player names */}
      {transactions.length > 0 && (
        <Card>
          <SectionTitle>Recent Transactions — Wk {week}</SectionTitle>
          {transactions.slice(0, 10).map((t, i) => {
            const clr = TX_COLOR[t.type] || TX_COLOR.free_agent;
            const teams = getTxTeams(t);
            const addedIds   = Object.keys(t.adds  || {});
            const droppedIds = Object.keys(t.drops || {});

            return (
              <div key={i} style={{
                borderBottom: i < Math.min(transactions.length, 10) - 1 ? "1px solid var(--bg3)" : "none",
                padding: "10px 0",
              }}>
                {/* Type + teams */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    background: clr.bg, color: clr.text,
                    borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{t.type.replace("_", " ")}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                    {teams.join(" ↔ ")}
                  </span>
                </div>
                {/* Player movements with names */}
                <div style={{ paddingLeft: 4, fontSize: 12, lineHeight: 1.7 }}>
                  {addedIds.map(id => {
                    const p = playerMap[id];
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 13 }}>+</span>
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>
                          {p ? `${p.first_name} ${p.last_name}` : id}
                        </span>
                        {p?.position && <span style={{ color: "var(--accent)", fontSize: 10, fontWeight: 700 }}>{p.position}</span>}
                        {p?.team && <span style={{ color: "var(--dim)", fontSize: 11 }}>{p.team}</span>}
                      </div>
                    );
                  })}
                  {droppedIds.map(id => {
                    const p = playerMap[id];
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--red)", fontWeight: 700, fontSize: 13 }}>−</span>
                        <span style={{ color: "var(--muted)" }}>
                          {p ? `${p.first_name} ${p.last_name}` : id}
                        </span>
                        {p?.position && <span style={{ color: "var(--dim)", fontSize: 10 }}>{p.position}</span>}
                        {p?.team && <span style={{ color: "var(--dim)", fontSize: 11 }}>{p.team}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* AI Advisor — reactive, also with web search */}
      <Card>
        <SectionTitle>AI Advisor — Ask Anything</SectionTitle>
        <p style={{ fontSize: 11, color: "var(--dim)", marginBottom: 12, lineHeight: 1.5 }}>
          Select a mode for a focused analysis, or type your own question. All queries search the web for current data.
        </p>

        {/* Mode pills */}
        <div
          className={isMobile ? "scroll-x" : ""}
          style={{ display: "flex", flexWrap: isMobile ? "nowrap" : "wrap", gap: 6, marginBottom: 12, paddingBottom: isMobile ? 2 : 0 }}
        >
          {MODES.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setQuery(""); }} style={{
              background: mode === m.id ? "var(--accent)" : "var(--bg3)",
              color: mode === m.id ? "var(--bg)" : "var(--muted)",
              border: "none", borderRadius: 20, padding: "7px 16px",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              flexShrink: 0, minHeight: 36,
            }}>{m.label}</button>
          ))}
        </div>

        <AIInput
          value={query}
          onChange={setQuery}
          onSubmit={runAI}
          placeholder="Ask a specific question, or hit Analyse for the selected mode…"
          loading={busy}
        />
        <AIBox loading={busy}>{aiText}</AIBox>
      </Card>
    </div>
  );
}
