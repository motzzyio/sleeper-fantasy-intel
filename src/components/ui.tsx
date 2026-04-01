import React from "react";

const positionColors: Record<string, { bg: string; color: string }> = {
  QB:  { bg: '#7c3aed', color: '#ddd6fe' },
  RB:  { bg: '#065f46', color: '#6ee7b7' },
  WR:  { bg: '#1d4ed8', color: '#93c5fd' },
  TE:  { bg: '#059669', color: '#6ee7b7' },
  K:   { bg: '#374151', color: '#9ca3af' },
  DEF: { bg: '#374151', color: '#9ca3af' },
  DST: { bg: '#374151', color: '#9ca3af' },
};
export const posColor = (pos: string) => positionColors[pos]?.bg || "#555";

export const Badge = ({ pos }: { pos: string }) => {
  const colors = positionColors[pos] || { bg: '#555', color: '#fff' };
  return (
    <span style={{
      background: colors.bg, color: colors.color, borderRadius: 4,
      padding: "1px 7px", fontSize: 11, fontWeight: 700, letterSpacing: 1,
      fontFamily: "monospace", display: "inline-block",
    }}>{pos}</span>
  );
};

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

export const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '14px',
    ...style
  }}>
    {children}
  </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    color: 'var(--accent-text)',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  }}>
    {children}
  </h3>
);

export const AIBox = ({ loading, children }: { loading: boolean; children?: React.ReactNode }) => (
  <div style={{
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '13px',
    lineHeight: 1.6,
    color: 'var(--text)',
    minHeight: '60px',
    whiteSpace: 'pre-wrap' as const
  }}>
    {loading ? <Spinner label="Analyzing..." /> : children || <span style={{ color: 'var(--dim)' }}>AI analysis will appear here…</span>}
  </div>
);

export const StatBox = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
    <div style={{ color: "var(--dim)", fontSize: 10, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
    <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{value}</div>
  </div>
);

export const Tab = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'var(--bg3)' : 'transparent',
      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
      color: active ? 'var(--accent-text)' : 'var(--text3)',
      padding: '7px 14px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: active ? 700 : 400,
      cursor: 'pointer',
      minHeight: '36px',
      whiteSpace: 'nowrap' as const
    }}
  >
    {children}
  </button>
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
