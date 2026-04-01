"use client";
import { useState } from "react";
import { Badge, posColor, Card, SectionTitle, AIBox, AIInput, StatBox } from "./ui";
import { useIsMobile } from "@/lib/useIsMobile";
import { askAI } from "@/lib/api";
import type { League, Roster, LeagueUser, Draft, DraftPick } from "@/lib/types";

interface Props {
  league: League;
  rosters: Roster[];
  leagueUsers: LeagueUser[];
  drafts: Draft[];
  draftPicks: Record<string, DraftPick[]>;
  userId: string;
}

export default function DraftTab({ league, rosters, leagueUsers, drafts, draftPicks, userId }: Props) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState(false);

  const uMap: Record<string, string> = {};
  leagueUsers.forEach(u => { uMap[u.user_id] = u.display_name || u.username; });

  const rMap: Record<number, string> = {};
  rosters.forEach(r => { rMap[r.roster_id] = r.owner_id; });

  // Build position frequency and R1 picks per owner
  const posFreq: Record<string, Record<string, number>> = {};
  const r1Picks: Record<string, Array<{ season: string; player: string; pos: string }>> = {};

  Object.entries(draftPicks).forEach(([did, picks]) => {
    const draft = drafts.find(d => d.draft_id === did);
    picks.forEach(p => {
      const owner = uMap[rMap[p.roster_id]] || uMap[p.picked_by] || `Team ${p.roster_id}`;
      const pos = p.metadata?.position || "?";
      if (!posFreq[owner]) posFreq[owner] = {};
      posFreq[owner][pos] = (posFreq[owner][pos] || 0) + 1;
      if (p.round === 1) {
        if (!r1Picks[owner]) r1Picks[owner] = [];
        r1Picks[owner].push({
          season: draft?.season || "?",
          player: `${p.metadata?.first_name || ""} ${p.metadata?.last_name || ""}`.trim(),
          pos,
        });
      }
    });
  });

  const runAI = async () => {
    setBusy(true);
    setAiText("");
    const sc = league.scoring_settings;
    const settings = `Teams:${league.settings.num_teams} PPR:${sc.rec ?? 0} PassTD:${sc.pass_td ?? 4}pts Roster:[${league.roster_positions.join(",")}] BestBall:${league.settings.best_ball ? "Yes" : "No"}`;

    const draftSummaries = Object.entries(draftPicks).map(([did, ps]) => {
      const draft = drafts.find(d => d.draft_id === did);
      if (!ps.length) return null;
      const byPos: Record<string, number> = {};
      ps.forEach(p => {
        const pos = p.metadata?.position || "?";
        byPos[pos] = (byPos[pos] || 0) + 1;
      });
      const posStr = Object.entries(byPos).map(([p, c]) => `${p}:${c}`).join(", ");
      const top = ps.slice(0, 24).map(p =>
        `R${p.round}.${p.draft_slot || p.pick_no} ${p.metadata?.position} ${p.metadata?.first_name} ${p.metadata?.last_name}`
      ).join(", ");
      return `${draft?.season || "?"} [${draft?.type || "snake"}] — pos: ${posStr} — picks: ${top}`;
    }).filter(Boolean);

    const system = `You are an expert fantasy football draft strategist. Be specific, sharp, and actionable. Use bullet points. Reference actual player names and positions from the data. Keep your response under 500 words.`;
    const prompt = `LEAGUE: ${league.name}
SETTINGS: ${settings}
DRAFT HISTORY (${draftSummaries.length} seasons):
${draftSummaries.join("\n\n") || "No draft history yet."}

QUESTION: ${query || "Analyse this league's draft tendencies — which positions get taken early vs late, what patterns exist across managers, and give me a specific draft strategy to exploit those tendencies. Note positional scarcity and ADP value gaps for this scoring format."}`;

    try {
      const res = await askAI(system, prompt);
      setAiText(res);
    } catch {
      setAiText("Error fetching AI analysis. Check your API key.");
    }
    setBusy(false);
  };

  const sc = league.scoring_settings;

  return (
    <div className="fade-in">
      {/* League Settings */}
      <Card>
        <SectionTitle>League Settings</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          <StatBox label="Teams" value={league.settings.num_teams} />
          <StatBox label="PPR" value={sc.rec ?? 0} />
          <StatBox label="Pass TD" value={`${sc.pass_td ?? 4}pts`} />
          <StatBox label="Best Ball" value={league.settings.best_ball ? "Yes" : "No"} />
          <StatBox label="Playoff Teams" value={league.settings.playoff_teams ?? "—"} />
          <StatBox label="Trade Deadline" value={`Wk ${league.settings.trade_deadline ?? "?"}`} />
        </div>
        <div style={{ marginTop: 10, color: "var(--dim)", fontSize: 11 }}>
          Roster: {league.roster_positions.join("  ·  ")}
        </div>
      </Card>

      {/* Position tendency table */}
      {Object.keys(posFreq).length > 0 && (
        <Card>
          <SectionTitle>Historical Position Tendencies</SectionTitle>
          {isMobile ? (
            // Mobile: stacked card per manager
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(posFreq).map(([owner, freq]) => {
                const total = Object.values(freq).reduce((a, b) => a + b, 0);
                return (
                  <div key={owner} style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text)", marginBottom: 8 }}>{owner}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                      {["QB", "RB", "WR", "TE", "K", "DEF"].map(p => {
                        const pct = total ? Math.round((freq[p] || 0) / total * 100) : 0;
                        return (
                          <div key={p} style={{ textAlign: "center" }}>
                            <Badge pos={p} />
                            <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: pct > 25 ? "#fff" : "var(--dim)", background: posColor(p) + (pct > 30 ? "aa" : pct > 15 ? "55" : "18"), borderRadius: 4, padding: "2px 0" }}>{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Desktop: full table
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--dim)", fontWeight: 500, fontSize: 11 }}>Manager</th>
                    {["QB", "RB", "WR", "TE", "K", "DEF"].map(p => (
                      <th key={p} style={{ textAlign: "center", padding: "4px 6px" }}><Badge pos={p} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(posFreq).map(([owner, freq]) => {
                    const total = Object.values(freq).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={owner} style={{ borderBottom: "1px solid var(--bg3)" }}>
                        <td style={{ padding: "7px 10px", color: "var(--text)", fontWeight: 500 }}>{owner}</td>
                        {["QB", "RB", "WR", "TE", "K", "DEF"].map(p => {
                          const pct = total ? Math.round((freq[p] || 0) / total * 100) : 0;
                          return (
                            <td key={p} style={{ textAlign: "center", padding: "4px 6px" }}>
                              <div style={{
                                background: posColor(p) + (pct > 22 ? "99" : pct > 10 ? "44" : "11"),
                                color: pct > 18 ? "#fff" : "var(--dim)",
                                borderRadius: 4, padding: "3px 0", fontSize: 11,
                              }}>
                                {pct ? `${pct}%` : "—"}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* R1 picks */}
      {Object.keys(r1Picks).length > 0 && (
        <Card>
          <SectionTitle>Round 1 Picks Across Drafts</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(155px, 1fr))", gap: 8 }}>
            {Object.entries(r1Picks).map(([owner, picks]) => (
              <div key={owner} style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ color: "var(--accent)", fontSize: 11, marginBottom: 7, fontWeight: 700 }}>{owner}</div>
                {picks.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                    <Badge pos={p.pos} />
                    <span style={{ flex: 1, fontSize: isMobile ? 11 : 12 }}>{p.player || "Unknown"}</span>
                    <span style={{ color: "var(--dim)", fontSize: 10 }}>'{p.season.slice(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No drafts yet */}
      {drafts.length === 0 && (
        <Card>
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
            No draft history found yet. The AI advisor will use your league settings to give general strategy advice.
          </div>
        </Card>
      )}

      {/* AI Advisor */}
      <Card>
        <SectionTitle>AI Draft Advisor</SectionTitle>
        <AIInput
          value={query}
          onChange={setQuery}
          onSubmit={runAI}
          placeholder="Ask anything about your draft… or leave blank for full analysis"
          loading={busy}
        />
        <AIBox loading={busy}>{aiText}</AIBox>
      </Card>
    </div>
  );
}
