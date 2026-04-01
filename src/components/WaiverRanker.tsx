'use client';

import { useState, useEffect } from 'react';
import { askAIWithSearch } from '@/lib/api';
import { Badge, Spinner } from './ui';

type WaiverVerdict = 'Must Add' | 'Streamable' | 'Stash';
type PositionFilter = 'All' | 'QB' | 'RB' | 'WR' | 'TE';

interface WaiverPlayer {
  name: string;
  position: string;
  team: string;
  verdict: WaiverVerdict;
  reason: string;
  injuryStatus: string | null;
}

function parseWaiverPlayers(raw: string): WaiverPlayer[] {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: unknown) => {
      if (typeof p !== 'object' || p === null) return false;
      const obj = p as Record<string, unknown>;
      return (
        typeof obj.name === 'string' &&
        typeof obj.position === 'string' &&
        typeof obj.team === 'string' &&
        typeof obj.verdict === 'string' &&
        typeof obj.reason === 'string'
      );
    }).map((p: Record<string, unknown>) => ({
      name: p.name as string,
      position: p.position as string,
      team: p.team as string,
      verdict: p.verdict as WaiverVerdict,
      reason: p.reason as string,
      injuryStatus: typeof p.injuryStatus === 'string' ? p.injuryStatus : null
    }));
  } catch {
    return [];
  }
}

const verdictColor: Record<WaiverVerdict, string> = {
  'Must Add':   '#10b981',
  'Streamable': '#f59e0b',
  'Stash':      '#6b7280'
};

const POSITIONS: PositionFilter[] = ['All', 'QB', 'RB', 'WR', 'TE'];

interface WaiverRankerProps {
  rosterSummary: string;
  trendingPlayerNames: string[];
  leagueContext: string;
  week: number;
}

export function WaiverRanker({ rosterSummary, trendingPlayerNames, leagueContext, week }: WaiverRankerProps) {
  const [players, setPlayers] = useState<WaiverPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PositionFilter>('All');

  const fetchWaivers = async () => {
    setLoading(true);
    setPlayers([]);

    const system = `You are an expert fantasy football waiver wire analyst. Respond ONLY with a valid JSON array. No other text.
Each element: { "name": string, "position": "QB"|"RB"|"WR"|"TE", "team": string, "verdict": "Must Add"|"Streamable"|"Stash", "reason": string, "injuryStatus": string | null }
"reason": one sentence why this player matters for this specific roster.
"injuryStatus": current injury designation (e.g. "Questionable", "Doubtful") or null if healthy.
Return up to 8 players ranked by priority for this roster. Exclude players already on the roster.`;

    const prompt = `NFL Week ${week}. ${leagueContext}

My roster: ${rosterSummary}

Currently trending adds (league-wide): ${trendingPlayerNames.slice(0, 15).join(', ')}

Rank the best available waiver wire pickups for my specific roster needs. Use current injury news.`;

    const raw = await askAIWithSearch(system, prompt);
    setPlayers(parseWaiverPlayers(raw));
    setLoading(false);
  };

  useEffect(() => { fetchWaivers(); }, []);

  const filtered = filter === 'All' ? players : players.filter(p => p.position === filter);

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px',
      marginBottom: '12px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <span style={{
          color: 'var(--accent-text)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '1px'
        }}>
          📋 WAIVER RANKER
        </span>
        <button
          onClick={fetchWaivers}
          disabled={loading}
          style={{
            background: 'var(--bg3)',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '11px',
            padding: '6px 12px',
            borderRadius: '6px',
            minHeight: '32px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Position filter pills */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '2px',
        marginBottom: '12px',
        scrollbarWidth: 'none' as const
      }}>
        {POSITIONS.map(pos => (
          <button
            key={pos}
            className={filter === pos ? 'pill pill-active' : 'pill pill-inactive'}
            onClick={() => setFilter(pos)}
          >
            {pos}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Ranking waiver wire..." />
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text3)', fontSize: '12px' }}>
          {players.length === 0 ? 'No data yet. Try refreshing.' : `No ${filter} players in results.`}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((player, i) => (
            <div key={i} style={{
              background: '#1a1740',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              minHeight: '56px',
              gap: '8px'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' as const }}>
                  <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 700 }}>{player.name}</span>
                  <Badge pos={player.position} />
                  {player.injuryStatus && (
                    <span style={{
                      background: '#dc262633',
                      color: '#f87171',
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {player.injuryStatus}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: '11px' }}>
                  {player.team} · {player.reason}
                </div>
              </div>
              <span style={{
                color: verdictColor[player.verdict],
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap' as const,
                flexShrink: 0
              }}>
                {player.verdict}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
