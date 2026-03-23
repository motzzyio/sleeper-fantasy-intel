import React from "react";

const POS_CLR: Record<string, string> = {
  QB: "#e74c3c", RB: "#27ae60", WR: "#2980b9",
  TE: "#f39c12", K: "#8e44ad", DEF: "#7f8c8d", DST: "#7f8c8d",
};
export const posColor = (pos: string) => POS_CLR[pos] || "#555";

export const Badge = ({ pos }: { pos: string }) => (
  <span style={{
    background: posColor(pos), color: "#fff", borderRadius: 4,
    padding: "1px 7px", fontSize: 11, fontWeight: 700, letterSpacing: 1,
    fontFamily: "monospace", display: "inline-block",
  }}>{pos}</span>
);

export const Spinner = ({ label = "Loading…" }: { label?: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>
    <div style={{
      width: 16, height: 16, border: "2px solid var(--bg3)",
      borderTop: "2px solid var(--accent)", borderRadius: "50%",
      animation: "spin .8s linear infinite", flexShrink: 0,
    }} />
    {label}
  </div>
);

export const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 10, padding: 18, marginBottom: 14, ...style,
  }}>{children}</div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{
    color: "var(--accent)", fontSize: 10, letterSpacing: 2,
    textTransform: "uppercase", margin: "0 0 14px", fontFamily: "monospace",
  }}>{children}</h3>
);

export const AIBox = ({ text, loading }: { text: string; loading: boolean }) => (
  <div style={{
    background: "var(--bg)", border: "1px solid var(--accent-border)",
    borderRadius: 8, padding: 14, marginTop: 12, fontSize: 13.5,
    lineHeight: 1.8, color: "#cdd9e5", whiteSpace: "pre-wrap", minHeight: 52,
  }}>
    {loading
      ? <Spinner label="Claude is analysing your league…" />
      : text || <span style={{ color: "var(--dim)" }}>AI analysis will appear here…</span>}
  </div>
);

export const StatBox = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
    <div style={{ color: "var(--dim)", fontSize: 10, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
    <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{value}</div>
  </div>
);

export const Tab = ({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} style={{
    background: "none", border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    color: active ? "var(--accent)" : "var(--dim)",
    padding: "9px 16px", fontWeight: 600, fontSize: 13,
    cursor: "pointer", marginBottom: -1, transition: "color .15s",
  }}>{label}</button>
);

export const AIInput = ({
  value, onChange, onSubmit, placeholder, loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  loading: boolean;
}) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === "Enter" && !loading && onSubmit()}
      placeholder={placeholder}
      style={{
        flex: "1 1 200px", background: "var(--bg)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "11px 14px", color: "var(--text)",
        fontSize: 13, outline: "none", minHeight: 44,
      }}
    />
    <button
      onClick={onSubmit}
      disabled={loading}
      style={{
        background: loading ? "var(--bg3)" : "var(--accent)",
        color: loading ? "var(--dim)" : "var(--bg)",
        border: "none", borderRadius: 8, padding: "11px 20px",
        fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: 13,
        whiteSpace: "nowrap", minHeight: 44, flex: "0 0 auto",
      }}
    >
      {loading ? "…" : "Analyse"}
    </button>
  </div>
);

export const LoadProgress = ({ steps, current }: { steps: string[]; current: number }) => (
  <div style={{ padding: "28px 0" }}>
    {steps.map((s, i) => (
      <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          background: i < current ? "var(--accent)" : i === current ? "var(--accent-dim)" : "var(--bg3)",
          border: i === current ? "2px solid var(--accent)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: i < current ? "var(--bg)" : "var(--dim)",
        }}>
          {i < current ? "✓" : i === current
            ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite" }} />
            : ""}
        </div>
        <span style={{ fontSize: 13, color: i < current ? "var(--accent)" : i === current ? "var(--text)" : "var(--dim)" }}>
          {s}
        </span>
      </div>
    ))}
  </div>
);
