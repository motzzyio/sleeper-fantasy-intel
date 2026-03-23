"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Spinner, LoadProgress } from "./ui";
import { useIsMobile } from "@/lib/useIsMobile";
import DraftTab from "./DraftTab";
import InSeasonTab from "./InSeasonTab";
import StandingsTab from "./StandingsTab";
import type {
  NFLState, SleeperUser, League, Roster, LeagueUser,
  Draft, DraftPick, Matchup, Transaction, TrendingPlayer, PlayerMap,
} from "@/lib/types";

interface Props {
  username: string;
  onReset: () => void;
}

type TabId = "draft" | "inseason" | "standings";

const LOAD_STEPS = [
  "Fetching NFL state & your Sleeper profile",
  "Loading your leagues for this season",
  "Fetching league details, rosters & users",
  "Loading draft history",
  "Loading in-season data",
];

export default function Dashboard({ username, onReset }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selLeague, setSelLeague] = useState<League | null>(null);
  const [lgData, setLgData] = useState<League | null>(null);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [lgUsers, setLgUsers] = useState<LeagueUser[]>([]);
  const [nflState, setNflState] = useState<NFLState | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftPicks, setDraftPicks] = useState<Record<string, DraftPick[]>>({});
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trending, setTrending] = useState<TrendingPlayer[]>([]);
  const [playerMap, setPlayerMap] = useState<PlayerMap>({});
  const [tab, setTab] = useState<TabId>("draft");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    bootstrap();
  }, [username]);

  const bootstrap = async () => {
    setDone(false);
    setErr(null);
    setStep(0);
    try {
      const [st, usr]: [NFLState, SleeperUser] = await Promise.all([
        api.getNFLState(),
        api.getUser(username),
      ]);
      if (!usr?.user_id) throw new Error(`Sleeper user "${username}" not found.`);
      setNflState(st);
      setUserId(usr.user_id);

      setStep(1);
      const lgs: League[] = await api.getLeagues(usr.user_id, st.season);
      const list = Array.isArray(lgs) ? lgs : [];
      setLeagues(list);
      if (!list.length) throw new Error("No NFL leagues found for this account in the current season.");

      await loadLeague(list[0], st, usr.user_id);
    } catch (e: any) {
      setErr(e.message || "Unknown error");
      setDone(true);
    }
  };

  const loadLeague = async (lg: League, st: NFLState, uid: string) => {
    setSelLeague(lg);
    setDone(false);
    setErr(null);
    try {
      setStep(2);
      const [lgd, ros, usl]: [League, Roster[], LeagueUser[]] = await Promise.all([
        api.getLeague(lg.league_id),
        api.getRosters(lg.league_id),
        api.getUsers(lg.league_id),
      ]);
      setLgData(lgd);
      setRosters(Array.isArray(ros) ? ros : []);
      setLgUsers(Array.isArray(usl) ? usl : []);

      setStep(3);
      const drs: Draft[] = await api.getDrafts(lg.league_id);
      const dlist = Array.isArray(drs) ? drs : [];
      setDrafts(dlist);

      const allPicks: Record<string, DraftPick[]> = {};
      await Promise.all(dlist.slice(0, 4).map(async (d) => {
        const p: DraftPick[] = await api.getDraftPicks(d.draft_id);
        allPicks[d.draft_id] = Array.isArray(p) ? p : [];
      }));
      setDraftPicks(allPicks);

      setStep(4);
      const week = Math.min(st?.week || 1, 18);
      const [mu, tx, tr, pm]: [Matchup[], Transaction[], TrendingPlayer[], PlayerMap] = await Promise.all([
        api.getMatchups(lg.league_id, week),
        api.getTransactions(lg.league_id, week),
        api.getTrending(),
        api.getPlayers(),
      ]);
      setMatchups(Array.isArray(mu) ? mu : []);
      setTransactions(Array.isArray(tx) ? tx : []);
      setTrending(Array.isArray(tr) ? tr : []);
      setPlayerMap(pm && typeof pm === "object" ? pm : {});

      setDone(true);
    } catch (e: any) {
      setErr(e.message || "Unknown error");
      setDone(true);
    }
  };

  const isLoading = !done && !err;
  const isMobile = useIsMobile();

  const TABS: { id: TabId; label: string }[] = [
    { id: "draft", label: "🏈 Draft" },
    { id: "inseason", label: "📅 In-Season" },
    { id: "standings", label: "🏆 Standings" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
      fontFamily: "inherit",
    }}>
      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg)", borderBottom: "1px solid var(--bg3)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "12px 14px 0" : "16px 24px 0" }}>

          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
              <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: 3, fontFamily: "monospace", marginBottom: 3 }}>
                SLEEPER · FANTASY INTEL
              </div>
              <h1 style={{
                fontSize: isMobile ? 17 : 22, fontWeight: 800, color: "var(--text)",
                lineHeight: 1.2, margin: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {lgData?.name || (isLoading ? "Loading…" : "No league found")}
              </h1>
              <div style={{ color: "var(--dim)", fontSize: 11, marginTop: 2 }}>
                @{username} · {nflState?.season || "—"} NFL Season
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{
                background: "var(--accent-dim)", border: "1px solid var(--accent-border)",
                borderRadius: 8, padding: "6px 12px", fontSize: 11, color: "var(--accent)",
                fontFamily: "monospace",
              }}>
                Wk {nflState?.week || "—"}
              </div>
              <button onClick={onReset} style={{
                background: "var(--bg3)", border: "none", borderRadius: 8,
                padding: "6px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer", minHeight: 32,
              }}>← Back</button>
            </div>
          </div>

          {/* League selector */}
          {leagues.length > 1 && (
            <div style={{ marginBottom: 10 }}>
              <div className="scroll-x" style={{ display: "flex", gap: 6, flexWrap: "nowrap", paddingBottom: 4 }}>
                {leagues.map(l => (
                  <button key={l.league_id}
                    onClick={() => nflState && userId && loadLeague(l, nflState, userId)}
                    style={{
                      background: selLeague?.league_id === l.league_id ? "var(--accent)" : "var(--bg3)",
                      color: selLeague?.league_id === l.league_id ? "var(--bg)" : "var(--muted)",
                      border: "none", borderRadius: 6, padding: "5px 12px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, minHeight: 32,
                    }}>{l.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="scroll-x" style={{ display: "flex", gap: 0, flexWrap: "nowrap" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "none", border: "none", flexShrink: 0,
                borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === t.id ? "var(--accent)" : "var(--dim)",
                padding: isMobile ? "9px 16px" : "10px 20px",
                fontWeight: 600, fontSize: isMobile ? 12 : 13,
                cursor: "pointer", marginBottom: -1, minHeight: 40,
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "16px 14px 48px" : "20px 24px 48px" }}>

        {/* Error */}
        {err && (
          <div style={{
            background: "#e74c3c15", border: "1px solid #e74c3c55",
            borderRadius: 8, padding: "12px 14px", marginBottom: 16,
            color: "var(--red)", fontSize: 13,
          }}>
            ⚠️ {err}
          </div>
        )}

        {/* Loading */}
        {isLoading && <LoadProgress steps={LOAD_STEPS} current={step} />}

        {/* Tab content */}
        {done && !err && lgData && nflState && userId && (
          <>
            {tab === "draft" && (
              <DraftTab
                league={lgData}
                rosters={rosters}
                leagueUsers={lgUsers}
                drafts={drafts}
                draftPicks={draftPicks}
                userId={userId}
              />
            )}
            {tab === "inseason" && (
              <InSeasonTab
                league={lgData}
                rosters={rosters}
                leagueUsers={lgUsers}
                matchups={matchups}
                transactions={transactions}
                trending={trending}
                nflState={nflState}
                userId={userId}
                playerMap={playerMap}
              />
            )}
            {tab === "standings" && (
              <StandingsTab
                rosters={rosters}
                leagueUsers={lgUsers}
                nflState={nflState}
                userId={userId}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
