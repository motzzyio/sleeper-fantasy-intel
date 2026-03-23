"use client";
import { useState } from "react";
import { Card, SectionTitle, AIBox, AIInput } from "./ui";
import { useIsMobile } from "@/lib/useIsMobile";
import { askAI } from "@/lib/api";
import type { League, Roster, LeagueUser, Matchup, Transaction, TrendingPlayer, NFLState } from "@/lib/types";

interface Props {
  league: League;
  rosters: Roster[];
  leagueUsers: LeagueUser[];
  matchups: Matchup[];
  transactions: Transaction[];
  trending: TrendingPlayer[];
  nflState: NFLState;
  userId: string;
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
  league, rosters, leagueUsers, matchups, transactions, trending, nflState, userId,
}: Props) {
  const isMobile = useIsMobile();
  const [query, setQuery]     = useState("");
  const [aiText, setAiText]   = useState("");
  const [busy, setBusy]       = useState(false);
  const [mode, setMode]       = useState("waiver");

  // ── Lookup maps ──────────────────────────────────────────────────────────
  const uMap: Record<string, string> = {};
  leagueUsers.forEach(u => { uMap[u.user_id] = u.display_name || u.username; });

  const rosterToOwner: Record<number, string> = {};
  rosters.forEach(r => { rosterToOwner[r.roster_id] = uMap[r.owner_id] || `Team ${r.roster_id}`; });

  const myRoster  = rosters.find(r => r.owner_id === userId);
  const myMatchup = myRoster ? matchups.find(m => m.roster_id === myRoster.roster_id) : null;
  const week      = nflState?.week || 1;

  // ── Opponent score this week ─────────────────────────────────────────────
  const opponentMatchup = myMatchup
    ? matchups.find(m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myMatchup.roster_id)
    : null;
  const opponentName = opponentMatchup ? rosterToOwner[opponentMatchup.roster_id] : null;

  // ── Transaction helpers ──────────────────────────────────────────────────
  // In Sleeper, adds/drops values are the roster_id that received/lost the player
  const getTxTeams = (tx: Transaction): string[] => {
    const ids = new Set<number>();
    if (tx.adds)  Object.values(tx.adds).forEach(id => ids.add(id as number));
    if (tx.drops) Object.values(tx.drops).forEach(id => ids.add(id as number));
    tx.roster_ids?.forEach(id => ids.add(id));
    return Array.from(ids).map(id => rosterToOwner[id] || `Team ${id}`);
  };

  // ── AI prompts ───────────────────────────────────────────────────────────
  const modePrompts: Record<string, string> = {
    waiver:   `Week ${week} waiver wire advice. Trending adds (last 24h): ${trending.slice(0, 12).map((t, i) => `#${i + 1} ${t.player_id}(${t.count}x)`).join(", ")}. Recent league transactions: ${transactions.slice(0, 6).map(t => `[${t.type}] +${Object.keys(t.adds || {}).join(",")}`).join(" | ")}. My roster player IDs: ${(myRoster?.players || []).join(", ")}. Who should I target on waivers and who's safe to drop?`,
    startsit: `Optimise my Week ${week} lineup. Current starters: ${(myRoster?.starters || []).join(", ")}. Full roster: ${(myRoster?.players || []).join(", ")}. Who should I start or sit? Flag any clear upgrades on my bench.`,
    trade:    `Trade strategy for Week ${week}. My players: ${(myRoster?.players || []).join(", ")}. Give me: (1) who to sell high on from my roster, (2) what positions to target via trade, (3) a specific approach to maximise my team's ceiling.`,
    injury:   `Week ${week} injury & bye planning. My roster: ${(myRoster?.players || []).join(", ")}. Flag bye weeks for weeks ${week}–${week + 2}, flag common injury concerns at this stage of season, suggest contingency moves.`,
  };

  const runAI = async () => {
    setBusy(true);
    setAiText("");
    const sc = league.scoring_settings;
    const system = `You are a sharp, no-fluff fantasy football in-season manager. Give specific, week-relevant, actionable advice. Use bullet points. Be direct and concise. Keep your response under 450 words.`;
    const prompt = `LEAGUE: ${league.name} | Week ${week} | PPR:${sc.rec ?? 0} | Teams:${league.settings.num_teams}\n${query ? `QUESTION: ${query}` : modePrompts[mode]}`;
    try {
      setAiText(await askAI(system, prompt));
    } catch {
      setAiText("Error fetching AI analysis. Check your API key.");
    }
    setBusy(false);
  };

  // ── Shared style tokens ──────────────────────────────────────────────────
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

      {/* Trending — horizontal scroll strip on mobile */}
      {trending.length > 0 && (
        <Card>
          <SectionTitle>Trending Adds — Last 24h</SectionTitle>
          <div
            className={isMobile ? "scroll-x" : ""}
            style={{ display: "flex", flexWrap: isMobile ? "nowrap" : "wrap", gap: 6, paddingBottom: isMobile ? 4 : 0 }}
          >
            {trending.slice(0, 15).map((t, i) => (
              <div key={i} style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "5px 12px", fontSize: 12, color: "var(--muted)",
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0, minHeight: 32,
              }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 11 }}>#{i + 1}</span>
                {t.player_id}
                <span style={{ color: "var(--dim)", fontSize: 11 }}>{t.count.toLocaleString()}×</span>
              </div>
            ))}
          </div>
          {isMobile && <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 6 }}>← scroll for more</div>}
          <p style={{ fontSize: 11, color: "var(--dim)", marginTop: isMobile ? 4 : 8 }}>
            Player IDs shown — ask the AI advisor to interpret these by name
          </p>
        </Card>
      )}

      {/* Transactions with team names */}
      {transactions.length > 0 && (
        <Card>
          <SectionTitle>Recent Transactions — Wk {week}</SectionTitle>
          {transactions.slice(0, 10).map((t, i) => {
            const clr = TX_COLOR[t.type] || TX_COLOR.free_agent;
            const teams = getTxTeams(t);
            const addedPlayers  = Object.keys(t.adds  || {});
            const droppedPlayers = Object.keys(t.drops || {});

            return (
              <div key={i} style={{
                borderBottom: i < transactions.length - 1 ? "1px solid var(--bg3)" : "none",
                padding: "10px 0",
              }}>
                {/* Row 1: type badge + team(s) */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{
                    background: clr.bg, color: clr.text,
                    borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{t.type}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                    {teams.join(" ↔ ")}
                  </span>
                </div>
                {/* Row 2: player movements */}
                <div style={{ paddingLeft: 4, fontSize: 12, lineHeight: 1.6 }}>
                  {addedPlayers.length > 0 && (
                    <div style={{ color: "var(--green)" }}>
                      + {addedPlayers.join(", ")}
                    </div>
                  )}
                  {droppedPlayers.length > 0 && (
                    <div style={{ color: "var(--red)" }}>
                      − {droppedPlayers.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* AI Advisor */}
      <Card>
        <SectionTitle>AI In-Season Advisor</SectionTitle>

        {/* Mode pills — scroll strip on mobile */}
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
        <AIBox text={aiText} loading={busy} />
      </Card>
    </div>
  );
}
