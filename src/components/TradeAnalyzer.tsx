'use client';

import { useState } from 'react';
import { askAIWithSearch } from '@/lib/api';
import { Spinner } from './ui';

type TradeVerdict = 'ACCEPT' | 'DECLINE' | 'COUNTER';

const VALID_TRADE_VERDICTS: TradeVerdict[] = ['ACCEPT', 'DECLINE', 'COUNTER'];

interface TradeResult {
  verdict: TradeVerdict;
  reasoning: string[];
  counter: string | null;
}

function parseTradeResult(raw: string): TradeResult | null {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!VALID_TRADE_VERDICTS.includes(parsed.verdict) || !Array.isArray(parsed.reasoning)) return null;
    return {
      verdict: parsed.verdict as TradeVerdict,
      reasoning: parsed.reasoning,
      counter: parsed.counter ?? null
    };
  } catch {
    return null;
  }
}

interface TradeAnalyzerProps {
  rosterPlayerNames: string[];
  leagueContext: string;
  week: number;
}

export function TradeAnalyzer({ rosterPlayerNames, leagueContext, week }: TradeAnalyzerProps) {
  const [giveChips, setGiveChips] = useState<string[]>([]);
  const [getChips, setGetChips] = useState<string[]>([]);
  const [getInput, setGetInput] = useState('');
  const [result, setResult] = useState<TradeResult | null>(null);
  const [rawResult, setRawResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [giveSelectOpen, setGiveSelectOpen] = useState(false);

  const availableGivePlayers = rosterPlayerNames.filter(p => !giveChips.includes(p));

  const addGive = (name: string) => {
    setGiveChips(prev => [...prev, name]);
    setGiveSelectOpen(false);
  };

  const removeGive = (name: string) => setGiveChips(prev => prev.filter(p => p !== name));

  const addGet = () => {
    const trimmed = getInput.trim();
    if (trimmed && !getChips.includes(trimmed)) {
      setGetChips(prev => [...prev, trimmed]);
    }
    setGetInput('');
  };

  const removeGet = (name: string) => setGetChips(prev => prev.filter(p => p !== name));

  const analyze = async () => {
    if (giveChips.length === 0 || getChips.length === 0) return;
    setLoading(true);
    setResult(null);
    setRawResult('');
    try {
      const system = `You are an expert fantasy football trade analyst. Respond ONLY with a valid JSON object. No explanation outside the JSON.
Schema: { "verdict": "ACCEPT" | "DECLINE" | "COUNTER", "reasoning": string[], "counter": string | null }
reasoning: 3-4 bullet strings explaining the verdict.
counter: a suggested counter-offer as a string, or null if not applicable.`;

      const prompt = `NFL Week ${week}. ${leagueContext}

My full roster: ${rosterPlayerNames.join(', ')}

Proposed trade:
- I give: ${giveChips.length > 0 ? giveChips.join(', ') : 'nothing'}
- I get: ${getChips.length > 0 ? getChips.join(', ') : 'nothing'}

Should I do this trade? Use current injury news and player values.`;

      const raw = await askAIWithSearch(system, prompt);
      setRawResult(raw);
      const parsed = parseTradeResult(raw);
      setResult(parsed);
    } catch {
      setRawResult('Error analyzing trade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px',
      marginBottom: '12px'
    }}>
      <div style={{
        color: 'var(--accent-text)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1px',
        marginBottom: '14px'
      }}>
        ⚖ TRADE ANALYZER
      </div>

      {/* You Give */}
      <div style={{
        background: 'var(--bg3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px'
      }}>
        <div style={{ color: 'var(--text3)', fontSize: '10px', marginBottom: '8px' }}>YOU GIVE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {giveChips.map(name => (
            <span key={name} className="chip">
              {name}
              <button className="chip-remove" onClick={() => removeGive(name)}>✕</button>
            </span>
          ))}
          {availableGivePlayers.length > 0 && (
            giveSelectOpen ? (
              <select
                autoFocus
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--accent)',
                  color: 'var(--text)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  minHeight: '36px'
                }}
                onChange={e => { if (e.target.value) addGive(e.target.value); }}
                onBlur={() => setGiveSelectOpen(false)}
                defaultValue=""
              >
                <option value="" disabled>Select player...</option>
                {availableGivePlayers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <button className="chip-add" onClick={() => setGiveSelectOpen(true)}>
                + add
              </button>
            )
          )}
        </div>
      </div>

      {/* You Get */}
      <div style={{
        background: 'var(--bg3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px'
      }}>
        <div style={{ color: 'var(--text3)', fontSize: '10px', marginBottom: '8px' }}>YOU GET</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {getChips.map(name => (
            <span key={name} className="chip">
              {name}
              <button className="chip-remove" onClick={() => removeGet(name)}>✕</button>
            </span>
          ))}
          <input
            value={getInput}
            onChange={e => setGetInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addGet(); } }}
            onBlur={addGet}
            placeholder="Type player name, press Enter"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              minHeight: '36px',
              flex: '1 1 140px',
              minWidth: '120px'
            }}
          />
        </div>
      </div>

      <button
        className="gradient-btn"
        onClick={analyze}
        disabled={loading || (giveChips.length === 0 || getChips.length === 0)}
        style={{ opacity: (loading || (giveChips.length === 0 || getChips.length === 0)) ? 0.5 : 1 }}
      >
        Analyze Trade
      </button>

      {loading && (
        <div style={{ marginTop: '12px' }}>
          <Spinner label="Analyzing trade..." />
        </div>
      )}

      {result && !loading && (
        <div style={{
          marginTop: '12px',
          background: 'var(--bg3)',
          borderRadius: '10px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ color: 'var(--accent-text)', fontSize: '10px', fontWeight: 700 }}>VERDICT</span>
            <span className={`verdict-${result.verdict}`} style={{ fontSize: '13px' }}>
              {result.verdict}
            </span>
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#c7d2fe', fontSize: '12px', lineHeight: 1.6 }}>
            {result.reasoning.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {result.counter && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: 'var(--bg3)',
              borderRadius: '6px',
              color: 'var(--accent-text)',
              fontSize: '12px'
            }}>
              <strong>Counter-offer:</strong> {result.counter}
            </div>
          )}
        </div>
      )}

      {!result && !loading && rawResult && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ color: 'var(--accent-text)', fontSize: '11px', marginBottom: '6px' }}>AI Response:</div>
          <p style={{ color: '#c7d2fe', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>{rawResult}</p>
        </div>
      )}
    </div>
  );
}
