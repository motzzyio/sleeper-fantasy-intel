'use client';

import { useState, useEffect } from 'react';
import { askAIWithSearch } from '@/lib/api';
import { Spinner } from './ui';

type IntelTag = 'TRADE' | 'WAIVER' | 'INJURY' | 'START' | 'SIT';

interface IntelItem {
  tag: IntelTag;
  text: string;
}

function parseIntelItems(raw: string): IntelItem[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const match = line.match(/^\[(TRADE|WAIVER|INJURY|START|SIT)\]\s+(.+)$/);
      if (!match) return null;
      return { tag: match[1] as IntelTag, text: match[2] };
    })
    .filter((item): item is IntelItem => item !== null);
}

interface IntelFeedProps {
  rosterSummary: string;
  leagueContext: string;
  week: number;
}

export function IntelFeed({ rosterSummary, leagueContext, week }: IntelFeedProps) {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntel = async () => {
    setLoading(true);
    setItems([]);
    const system = `You are an expert fantasy football analyst. Return exactly 5 action items for a fantasy manager.
Each item MUST start with a tag: [TRADE], [WAIVER], [INJURY], [START], or [SIT].
Format: [TAG] One clear, specific sentence of advice.
No other text. No numbering. No blank lines between items.`;

    const prompt = `NFL Week ${week}. ${leagueContext}

My roster: ${rosterSummary}

Give me 5 prioritized action items right now. Use current injury news and waiver wire availability.`;

    const result = await askAIWithSearch(system, prompt);
    setItems(parseIntelItems(result));
    setLoading(false);
  };

  useEffect(() => { fetchIntel(); }, []);

  return (
    <div style={{
      background: '#13103d',
      border: '1px solid #312e8155',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div
            className={loading ? 'pulse-dot' : undefined}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--accent)',
              flexShrink: 0
            }}
          />
          <span style={{
            color: 'var(--accent-text)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px'
          }}>
            AI INTEL FEED
          </span>
        </div>
        <button
          onClick={fetchIntel}
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

      {loading ? (
        <Spinner label="Generating intel..." />
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text3)', fontSize: '12px' }}>No intel available. Try refreshing.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              background: '#1a1740',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <span className={`tag tag-${item.tag}`} style={{ marginTop: '2px' }}>
                {item.tag}
              </span>
              <span style={{ color: '#c7d2fe', fontSize: '12px', lineHeight: 1.5 }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
