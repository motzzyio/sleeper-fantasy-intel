"use client";
import { Card, SectionTitle } from "./ui";
import { useIsMobile } from "@/lib/useIsMobile";
import type { Roster, LeagueUser, NFLState } from "@/lib/types";

interface Props {
  rosters: Roster[];
  leagueUsers: LeagueUser[];
  nflState: NFLState;
  userId: string;
}

export default function StandingsTab({ rosters, leagueUsers, nflState, userId }: Props) {
  const isMobile = useIsMobile();

  const uMap: Record<string, string> = {};
  leagueUsers.forEach(u => { uMap[u.user_id] = u.display_name || u.username; });

  const getPF  = (r: Roster) => (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100;
  const getPA  = (r: Roster) => (r.settings?.fpts_against || 0) + (r.settings?.fpts_against_decimal || 0) / 100;
  const getW   = (r: Roster) => r.settings?.wins || 0;
  const getL   = (r: Roster) => r.settings?.losses || 0;

  const sorted = [...rosters].sort((a, b) => {
    const wd = getW(b) - getW(a);
    return wd !== 0 ? wd : getPF(b) - getPF(a);
  });

  // ── Unlucky Bud calculation ───────────────────────────────────────────────
  // Rank each team by PF (would-be record rank) vs actual record rank
  // Unluckiest = teams whose PF rank is much better than their W/L rank
  // Also factor in highest PA (most scored against)
  const pfRanked = [...rosters].sort((a, b) => getPF(b) - getPF(a));
  const paRanked = [...rosters].sort((a, b) => getPA(b) - getPA(a)); // most PA first = unluckiest

  const unluckyScores = rosters.map(r => {
    const pfRank      = pfRanked.findIndex(x => x.roster_id === r.roster_id) + 1; // 1 = best scorer
    const actualRank  = sorted.findIndex(x => x.roster_id === r.roster_id) + 1;   // 1 = best record
    const paRank      = paRanked.findIndex(x => x.roster_id === r.roster_id) + 1; // 1 = most scored against
    const rankGap     = actualRank - pfRank; // positive = worse record than scoring deserves
    // Composite unlucky score: rank gap (weighted) + PA rank normalised
    const score       = (rankGap * 2) + (paRank / rosters.length) * 3;
    return { roster: r, pfRank, actualRank, paRank, rankGap, score };
  });

  const topUnlucky = [...unluckyScores]
    .filter(u => u.rankGap > 0 || u.paRank <= 3) // only show teams that are genuinely unlucky
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const rankColor = (i: number) => i === 0 ? "var(--gold)" : i < 3 ? "var(--accent)" : "var(--dim)";
  const maxPF = Math.max(...sorted.map(r => getPF(r)), 1);

  // Emoji tier for unlucky score
  const unluckyEmoji = (i: number) => ["😭", "😤", "😞", "😕"][i] || "😕";

  return (
    <div className="fade-in">

      {/* ── Standings ──────────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>League Standings — {nflState?.season}</SectionTitle>

        {isMobile ? (
          // Mobile: compact card list
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((r, i) => {
              const owner = uMap[r.owner_id] || `Team ${r.roster_id}`;
              const isMe  = r.owner_id === userId;
              return (
                <div key={r.roster_id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: isMe ? "var(--accent-dim)" : "var(--bg)",
                  border: isMe ? "1px solid var(--accent-border)" : "1px solid transparent",
                  borderRadius: 8, padding: "10px 12px",
                }}>
                  <div style={{ width: 22, textAlign: "center", fontWeight: 800, fontSize: 13, color: rankColor(i), flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isMe ? 700 : 400, color: isMe ? "var(--accent)" : "var(--text)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {owner}{isMe ? " ⭐" : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{getPF(r).toFixed(1)} PF · {getPA(r).toFixed(1)} PA</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 13 }}>{getW(r)}W</span>
                    <span style={{ color: "var(--red)", fontSize: 13 }}>{getL(r)}L</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop: full table
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["", "Manager", "W", "L", "T", "PF", "PA"].map(h => (
                    <th key={h} style={{ textAlign: h === "Manager" ? "left" : "center", padding: "6px 10px", color: "var(--dim)", fontWeight: 500, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const owner = uMap[r.owner_id] || `Team ${r.roster_id}`;
                  const isMe  = r.owner_id === userId;
                  return (
                    <tr key={r.roster_id} style={{ borderBottom: "1px solid var(--bg3)", background: isMe ? "var(--accent-dim)" : "transparent" }}>
                      <td style={{ textAlign: "center", padding: "9px 8px", fontWeight: 800, fontSize: 13, color: rankColor(i) }}>{i + 1}</td>
                      <td style={{ padding: "9px 10px", color: isMe ? "var(--accent)" : "var(--text)", fontWeight: isMe ? 700 : 400 }}>{owner}{isMe ? " ⭐" : ""}</td>
                      <td style={{ textAlign: "center", padding: "9px 8px", color: "var(--green)", fontWeight: 600 }}>{getW(r)}</td>
                      <td style={{ textAlign: "center", padding: "9px 8px", color: "var(--red)" }}>{getL(r)}</td>
                      <td style={{ textAlign: "center", padding: "9px 8px", color: "var(--dim)" }}>{r.settings?.ties || 0}</td>
                      <td style={{ textAlign: "center", padding: "9px 8px", color: "var(--text)" }}>{getPF(r).toFixed(1)}</td>
                      <td style={{ textAlign: "center", padding: "9px 8px", color: "var(--muted)" }}>{getPA(r).toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Points For bar chart ───────────────────────────────────────────── */}
      <Card>
        <SectionTitle>Points For — Season Total</SectionTitle>
        {sorted.map((r, i) => {
          const pf    = getPF(r);
          const owner = uMap[r.owner_id] || `Team ${r.roster_id}`;
          const isMe  = r.owner_id === userId;
          return (
            <div key={r.roster_id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{
                  color: isMe ? "var(--accent)" : "var(--muted)", fontWeight: isMe ? 700 : 400,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  maxWidth: isMobile ? "58%" : "72%",
                }}>{owner}</span>
                <span style={{ color: "var(--dim)", fontFamily: "monospace", fontSize: 11, flexShrink: 0 }}>{pf.toFixed(1)}</span>
              </div>
              <div style={{ background: "var(--bg3)", borderRadius: 4, height: 7, overflow: "hidden" }}>
                <div style={{
                  width: `${(pf / maxPF) * 100}%`, height: "100%", borderRadius: 4,
                  background: isMe ? "var(--accent)" : rankColor(i),
                  transition: "width .6s cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* ── Unlucky Bud ───────────────────────────────────────────────────── */}
      {topUnlucky.length > 0 && (
        <Card style={{ borderColor: "#f39c1244" }}>
          <SectionTitle>🍀 The Unlucky Bud Report</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
            Teams whose records don't reflect how well they've actually scored — ranked by how badly the schedule has screwed them.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topUnlucky.map(({ roster, pfRank, actualRank, paRank, rankGap }, i) => {
              const owner = uMap[roster.owner_id] || `Team ${roster.roster_id}`;
              const isMe  = roster.owner_id === userId;
              const pf    = getPF(roster);
              const pa    = getPA(roster);
              const pfRankSuffix = ["st","nd","rd"][pfRank - 1] || "th";
              const actualRankSuffix = ["st","nd","rd"][actualRank - 1] || "th";

              // Build the narrative blurb
              const blurb = (() => {
                const parts: string[] = [];
                if (pfRank <= 3) parts.push(`${pfRank}${pfRankSuffix} in scoring`);
                else parts.push(`${pfRank}${pfRankSuffix} in scoring`);
                if (actualRank > pfRank) parts.push(`but only ${actualRank}${actualRankSuffix} in the standings`);
                if (paRank <= 3) parts.push(`and the ${paRank === 1 ? "most" : paRank === 2 ? "2nd most" : "3rd most"} scored against all season`);
                return parts.join(", ") + ".";
              })();

              return (
                <div key={roster.roster_id} style={{
                  background: isMe ? "var(--accent-dim)" : "var(--bg)",
                  border: isMe ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                  borderRadius: 10, padding: "14px 16px",
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{unluckyEmoji(i)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isMe ? "var(--accent)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {owner}{isMe ? " ⭐" : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{blurb}</div>
                    </div>
                    {rankGap > 0 && (
                      <div style={{ background: "#e74c3c22", color: "var(--red)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0, textAlign: "center" }}>
                        -{rankGap} spots<br/>
                        <span style={{ fontSize: 9, fontWeight: 400, color: "var(--dim)" }}>deserved</span>
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {[
                      { label: "Record", value: `${getW(roster)}-${getL(roster)}` },
                      { label: "PF Rank", value: `#${pfRank}`, highlight: pfRank <= 3 },
                      { label: "Points For", value: pf.toFixed(1) },
                      { label: "Points Against", value: pa.toFixed(1), highlight: paRank <= 3 },
                    ].map(({ label, value, highlight }) => (
                      <div key={label} style={{ background: "var(--bg2)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "var(--dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? "var(--orange)" : "var(--text)" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 14, lineHeight: 1.5 }}>
            Ranking combines scoring rank vs record rank gap, plus points conceded. The bigger the gap between where you <em>should</em> be and where you <em>are</em>, the unluckier you've been.
          </p>
        </Card>
      )}
    </div>
  );
}
