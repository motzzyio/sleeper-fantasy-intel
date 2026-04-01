"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Spinner, LoadProgress, Tab } from "./ui";
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
  const [tab, setTab] = useState<TabId>("inseason");
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

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
      fontFamily: "inherit",
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onReset}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1
            }}
            aria-label="Back"
          >
            ←
          </button>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>
            SLEEPER <span style={{ color: 'var(--accent)' }}>INTEL</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Tab active={tab === 'draft'} onClick={() => setTab('draft')}>Draft</Tab>
          <Tab active={tab === 'standings'} onClick={() => setTab('standings')}>Standings</Tab>
        </div>
      </div>

      {/* League selector */}
      {leagues.length > 1 && (
        <div style={{ padding: '10px 14px', background: 'var(--bg)' }}>
          <select
            value={selLeague?.league_id || ''}
            onChange={e => {
              const lg = leagues.find(l => l.league_id === e.target.value);
              if (lg && nflState && userId) loadLeague(lg, nflState, userId);
            }}
            style={{
              width: '100%',
              background: 'var(--bg2)',
              border: '1px solid var(--bg3)',
              color: 'var(--accent-text)',
              fontSize: '13px',
              padding: '10px 12px',
              borderRadius: '8px',
              minHeight: '44px'
            }}
          >
            {leagues.map(l => (
              <option key={l.league_id} value={l.league_id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

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
