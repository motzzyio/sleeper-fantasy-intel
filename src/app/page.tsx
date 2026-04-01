"use client";
import { useState } from "react";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [input, setInput] = useState("motzzy");

  const handleSubmit = () => {
    if (input.trim()) setSubmitted(input.trim().toLowerCase());
  };

  if (submitted) {
    return <Dashboard username={submitted} onReset={() => setSubmitted("")} />;
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: 3, fontFamily: "monospace", marginBottom: 12 }}>
          SLEEPER · FANTASY INTEL
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>
          Your Fantasy Edge
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 32, fontSize: 14 }}>
          AI-powered draft analysis & in-season management for your Sleeper leagues
        </p>

        <div style={{
          background: "var(--bg2)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 24,
        }}>
          <label style={{ display: "block", textAlign: "left", fontSize: 11, color: "var(--dim)", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
            Sleeper Username
          </label>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. motzzy"
            style={{
              width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 14px", color: "var(--text)",
              fontSize: 14, outline: "none", marginBottom: 12,
            }}
          />
          <button
            onClick={handleSubmit}
            style={{
              width: "100%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
              border: "none", borderRadius: 8, padding: "11px 0",
              fontWeight: 700, fontSize: 14,
            }}
          >
            Load My Leagues →
          </button>
        </div>

        <p style={{ color: "var(--dim)", fontSize: 12, marginTop: 16 }}>
          Uses the public Sleeper API · No login required
        </p>
      </div>
    </div>
  );
}
