"use client";
import { useState } from "react";
import { Card, SectionTitle, AIBox, AIInput } from "./ui";
import { IntelFeed } from './IntelFeed';
import { TradeAnalyzer } from './TradeAnalyzer';
import { WaiverRanker } from './WaiverRanker';
import { useIsMobile } from "@/lib/useIsMobile";
import { askAIWithSearch } from "@/lib/api";
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

  // ── Transaction helpers ────────────────────────────────────────────────────
  const getTxTeams = (tx: Transaction): string[] => {
    const ids = new Set<number>();
    if (tx.adds)  Object.values(tx.adds).forEach(id => ids.add(id as number));
    if (tx.drops) Object.values(tx.drops).forEach(id => ids.add(id as number));
    tx.roster_ids?.forEach(id => ids.add(id));
    return Array.from(ids).map(id => rosterToOwner[id] || `Team ${id}`);
  };

  // ── Build roster context for AI (names, not IDs) ───────────────────────────
  const myStarterNames = (myRoster?.starters || []).map(id => playerName(id)).join(", ");

  // Plain-English roster summary for AI prompts
  const rosterSummary = myRoster?.players
    ?.map(id => {
      const p = playerMap[id];
      return p ? `${p.first_name} ${p.last_name} (${p.position}, ${p.team})` : id;
    })
    .join(', ') ?? 'Unknown roster';

  // ── Reactive AI (mode-based) ───────────────────────────────────────────────
  const modePrompts: Record<string, string> = {
    waiver: `Week ${week} waiver wire advice. Trending adds (last 24h): ${trending.slice(0, 10).map((t, i) => `#${i + 1} ${playerName(t.player_id)} — ${t.count} adds`).join(", ")}. My roster: ${rosterSummary}. Who should I target on waivers and who is safe to drop? Search for current week waiver wire rankings to support your answer.`,
    startsit: `Optimise my Week ${week} lineup. My current starters: ${myStarterNames}. My full roster: ${rosterSummary}. Search for Week ${week} matchup-based start/sit analysis and injury reports. Who should I start or sit? Flag any clear upgrades from my bench.`,
    trade: `Trade strategy for Week ${week}. My roster: ${rosterSummary}. Search for current player values and trade advice. Give me: (1) who to sell high on, (2) what positions to buy, (3) a specific trade target strategy.`,
    injury: `Week ${week} injury and bye planning. My roster: ${rosterSummary}. Search for the latest injury reports and bye week schedules for weeks ${week}–${week + 2}. Flag any players I need to address urgently and suggest contingency moves.`,
  };

  const runAI = async () => {
    setBusy(true);
    setAiText("");
    const sc = league.scoring_settings;
    const system = `You are a sharp fantasy football in-season manager with access to web search. Search for current Week ${week} NFL data to support your advice. Give specific, actionable recommendations. Use bullet points. Keep under 450 words.`;
    const prompt = `LEAGUE: ${league.name} | Week ${week} | PPR:${sc.rec ?? 0} | Teams:${league.settings.num_teams}\n${query ? `QUESTION: ${query}\nMy roster: ${rosterSummary}` : modePrompts[mode]}`;
    try {
      // Reactive queries also use web search for current data
      setAiText(await askAIWithSearch(system, prompt));
    } catch {
      setAiText("Error fetching AI analysis. Check your API key.");
    }
    setBusy(false);
  };

  // Roster player names for TradeAnalyzer dropdown
  const rosterPlayerNames = myRoster?.players
    ?.map(id => {
      const p = playerMap[id];
      return p ? `${p.first_name} ${p.last_name}` : null;
    })
    .filter((name): name is string => name !== null) ?? [];

  // Trending player names for WaiverRanker
  const trendingPlayerNames = trending
    ?.map(t => {
      const p = playerMap[t.player_id];
      return p ? `${p.first_name} ${p.last_name}` : null;
    })
    .filter((name): name is string => name !== null) ?? [];

  // Shared league context string
  const leagueContext = `${league?.settings?.num_teams ?? 12}-team league, ${
    league?.scoring_settings?.rec ? 'PPR' : 'standard'
  } scoring.`;

  return (
    <div className="fade-in">

      {/* Week + score — gradient hero card */}
      {myMatchup && (
        <div className="gradient-hero" style={{
          padding: '18px',
          margin: '12px',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px',
            background: '#6366f122', borderRadius: '50%'
          }} />
          <div style={{
            color: '#818cf8', fontSize: '10px', fontWeight: 700,
            letterSpacing: '1.5px', marginBottom: '8px'
          }}>
            WEEK {week} · {myMatchup.points > (opponentMatchup?.points ?? 0) ? 'PROJECTED WIN' : 'PROJECTED LOSS'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text)', fontSize: '32px', fontWeight: 800 }}>
              {myMatchup.points.toFixed(1)}
            </span>
            <span style={{ color: 'var(--text3)', fontSize: '14px' }}>vs</span>
            <span style={{ color: 'var(--text3)', fontSize: '22px', fontWeight: 600 }}>
              {(opponentMatchup?.points ?? 0).toFixed(1)}
            </span>
          </div>
          <div style={{ color: '#818cf8', fontSize: '11px' }}>
            {opponentName ?? 'Opponent'} ·{' '}
            {Math.abs(myMatchup.points - (opponentMatchup?.points ?? 0)).toFixed(1)} pt margin
          </div>
          {myRoster && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <span style={{
                background: '#6366f133', color: 'var(--accent-text)',
                padding: '4px 10px', borderRadius: '6px', fontSize: '10px'
              }}>
                {myRoster.settings.wins}–{myRoster.settings.losses} Record
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Intel Feed ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 12px' }}>
        <IntelFeed
          rosterSummary={rosterSummary}
          leagueContext={leagueContext}
          week={week}
        />
      </div>

      {/* ── Trade Analyzer ───────────────────────────────────────────────────── */}
      <div style={{ padding: '0 12px' }}>
        <TradeAnalyzer
          rosterPlayerNames={rosterPlayerNames}
          leagueContext={leagueContext}
          week={week}
        />
      </div>

      {/* ── Waiver Ranker ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 12px' }}>
        <WaiverRanker
          rosterSummary={rosterSummary}
          trendingPlayerNames={trendingPlayerNames}
          leagueContext={leagueContext}
          week={week}
        />
      </div>

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
