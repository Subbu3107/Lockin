import { useState, useEffect, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
// #0A0A0A  bg-void | #111318  bg-card | #1E2128  bg-border
// #F0F0F0  text-primary | #8A8F98  text-muted
// #FF4D00  accent-orange | #22C55E  green | #EF4444  red | #F59E0B  amber

const CATEGORIES = ["Job Hunt", "Build Apps", "Masters Prep", "Freelancing", "Upskilling"];
const LOCK_DURATIONS = [
  { label: "21 Days", days: 21, desc: "Habit formation" },
  { label: "30 Days", days: 30, desc: "Recommended" },
  { label: "60 Days", days: 60, desc: "Serious mode" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTodayStr = () => new Date().toISOString().split("T")[0];
const getDaysBetween = (d1, d2) => Math.floor((new Date(d2) - new Date(d1)) / 86400000);

function getLockDays(startDate, lockDays) {
  const days = [];
  for (let i = 0; i < lockDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function calcStreak(checkins, actions, startDate, lockDays) {
  const today = getTodayStr();
  const allDays = getLockDays(startDate, lockDays).filter(d => d <= today);
  const va = actions.filter(a => a.trim());
  let streak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const d = allDays[i];
    const dc = checkins[d] || {};
    if (d === today) {
      const doneToday = va.every((_, idx) => dc[idx]);
      if (doneToday) streak++;
      // today incomplete doesn't break — we check yesterday next
      continue;
    }
    const doneThatDay = va.every((_, idx) => dc[idx]);
    if (doneThatDay) streak++;
    else break;
  }
  return streak;
}

function calcConsistency(checkins, actions, startDate, lockDays) {
  const today = getTodayStr();
  const allDays = getLockDays(startDate, lockDays).filter(d => d < today); // past days only
  if (!allDays.length) return 0;
  const va = actions.filter(a => a.trim());
  const done = allDays.filter(d => {
    const dc = checkins[d] || {};
    return va.every((_, i) => dc[i]);
  });
  return Math.round((done.length / allDays.length) * 100);
}

function calcLongestStreak(checkins, actions, startDate, lockDays) {
  const today = getTodayStr();
  const allDays = getLockDays(startDate, lockDays).filter(d => d <= today);
  const va = actions.filter(a => a.trim());
  let longest = 0, cur = 0;
  for (const d of allDays) {
    const dc = checkins[d] || {};
    const done = va.every((_, i) => dc[i]);
    if (done) { cur++; longest = Math.max(longest, cur); }
    else cur = 0;
  }
  return longest;
}

function wasYesterdayMissed(checkins, actions) {
  const yesterday = getYesterday();
  const dc = checkins[yesterday] || {};
  const va = actions.filter(a => a.trim());
  if (!va.length) return false;
  return !va.every((_, i) => dc[i]);
}

function loadState() {
  try { const r = localStorage.getItem("lockin_v2"); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveState(s) { localStorage.setItem("lockin_v2", JSON.stringify(s)); }

// ── Shared styles ─────────────────────────────────────────────────────────────
const sh2 = { fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", margin: "0 0 8px" };
const sp = { color: "#8A8F98", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" };
const sinput = {
  width: "100%", background: "#0A0A0A", border: "1px solid #1E2128",
  borderRadius: 10, padding: "14px 16px", color: "#F0F0F0",
  fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const card = {
  background: "#111318", border: "1px solid #1E2128",
  borderRadius: 14, padding: "20px 22px", marginBottom: 16,
};

// ── StepHeader ────────────────────────────────────────────────────────────────
function StepHeader({ step, total, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
      <div style={{
        background: "rgba(255,77,0,0.15)", color: "#FF4D00",
        borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700,
      }}>Step {step} / {total}</div>
      <span style={{ color: "#8A8F98", fontSize: 12 }}>{label}</span>
    </div>
  );
}

// ── UnlockFlow — the brutal 4-step quit gate ──────────────────────────────────
function UnlockFlow({ state, onCancel, onUnlockRequested }) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const today = getTodayStr();
  const daysElapsed = getDaysBetween(state.startDate, today) + 1;
  const daysLeft = getDaysBetween(today, state.endDate);
  const streak = calcStreak(state.checkins, state.actions, state.startDate, state.lockDays);
  const consistency = calcConsistency(state.checkins, state.actions, state.startDate, state.lockDays);
  const PHRASE = "I am giving up on my commitment.";
  const phraseMatch = typed.trim() === PHRASE;

  const overlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 20,
  };
  const box = {
    background: "#111318", border: "1px solid #EF4444",
    borderRadius: 16, padding: "32px 28px", maxWidth: 480, width: "100%",
  };

  return (
    <div style={overlay}>
      <div style={box}>

        {/* Step 1 — Why? */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ ...sh2, color: "#EF4444" }}>Before you quit...</h2>
            <p style={sp}>Are you quitting because the path is wrong, or because it's hard?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["The path is wrong for me", "It's just hard right now"].map((opt) => (
                <button key={opt} onClick={() => { setReason(opt); setStep(2); }} style={{
                  padding: "14px 18px", borderRadius: 10, border: "1px solid #1E2128",
                  background: "#0A0A0A", color: "#F0F0F0", cursor: "pointer",
                  fontWeight: 600, fontSize: 15, textAlign: "left",
                  transition: "border-color 0.15s",
                }}
                  onMouseOver={e => e.currentTarget.style.borderColor = "#EF4444"}
                  onMouseOut={e => e.currentTarget.style.borderColor = "#1E2128"}
                >{opt}</button>
              ))}
            </div>
            <button onClick={onCancel} style={{
              marginTop: 20, width: "100%", padding: "12px",
              borderRadius: 10, border: "1px solid #1E2128",
              background: "transparent", color: "#8A8F98", cursor: "pointer",
            }}>← Keep going</button>
          </>
        )}

        {/* Step 2 — Type the phrase */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✍️</div>
            <h2 style={{ ...sh2, color: "#EF4444" }}>Say it out loud.</h2>
            <p style={sp}>
              You said: <em style={{ color: "#F0F0F0" }}>"{reason}"</em><br /><br />
              To proceed, type exactly:
            </p>
            <div style={{
              background: "#0A0A0A", border: "1px solid #1E2128",
              borderRadius: 8, padding: "12px 14px", marginBottom: 16,
              fontFamily: "monospace", fontSize: 14, color: "#FF4D00",
              letterSpacing: "0.3px",
            }}>{PHRASE}</div>
            <input
              autoFocus
              style={{ ...sinput, marginBottom: 16 }}
              placeholder="Type the phrase above..."
              value={typed}
              onChange={e => setTyped(e.target.value)}
            />
            <button
              disabled={!phraseMatch}
              onClick={() => setStep(3)}
              style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none",
                background: phraseMatch ? "#EF4444" : "#1E2128",
                color: phraseMatch ? "#fff" : "#8A8F98",
                fontWeight: 800, fontSize: 16,
                cursor: phraseMatch ? "pointer" : "not-allowed",
              }}>Continue →</button>
            <button onClick={() => setStep(1)} style={{
              marginTop: 10, width: "100%", padding: "10px",
              borderRadius: 10, border: "none",
              background: "transparent", color: "#8A8F98", cursor: "pointer",
            }}>← Go back</button>
          </>
        )}

        {/* Step 3 — Show stats */}
        {step === 3 && (
          <>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
            <h2 style={{ ...sh2 }}>Here's what you're walking away from.</h2>
            <div style={{
              background: "#0A0A0A", borderRadius: 10, padding: "18px",
              margin: "16px 0", display: "flex", flexDirection: "column", gap: 12,
            }}>
              {[
                ["Current Streak", `${streak} day${streak !== 1 ? "s" : ""} 🔥`],
                ["Days Remaining", `${Math.max(0, daysLeft)} days`],
                ["Consistency", `${consistency}%`],
                ["Days Invested", `${Math.max(1, daysElapsed)} days`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#8A8F98", fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#F0F0F0" }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding: "14px", borderRadius: 10,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#F0F0F0", fontSize: 14, lineHeight: 1.6, marginBottom: 20,
            }}>
              You have already invested <strong>{Math.max(1, daysElapsed)} days</strong> into this goal.
              {streak > 0 && <> Your {streak}-day streak will be gone forever.</>}
            </div>
            <button onClick={() => setStep(4)} style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: "#EF4444", color: "#fff", fontWeight: 800,
              fontSize: 16, cursor: "pointer",
            }}>I still want to quit →</button>
            <button onClick={onCancel} style={{
              marginTop: 10, width: "100%", padding: "12px",
              borderRadius: 10, border: "1px solid #22C55E",
              background: "transparent", color: "#22C55E", cursor: "pointer",
              fontWeight: 700,
            }}>← I changed my mind. Keep going.</button>
          </>
        )}

        {/* Step 4 — 24hr cooldown */}
        {step === 4 && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>⏳</div>
            <h2 style={{ ...sh2, textAlign: "center" }}>Unlock requested.</h2>
            <p style={{ ...sp, textAlign: "center" }}>
              Come back <strong style={{ color: "#F0F0F0" }}>tomorrow</strong> if you still want to quit.
            </p>
            <div style={{
              background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.25)",
              borderRadius: 10, padding: "16px", textAlign: "center", marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: "#8A8F98", marginBottom: 4 }}>Unlock available after</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#FF4D00" }}>
                {new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#8A8F98", textAlign: "center", marginBottom: 20 }}>
              Most people who get here don't come back to quit.<br />That's the point.
            </p>
            <button onClick={() => onUnlockRequested(Date.now() + 86400000)} style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: "#1E2128", color: "#8A8F98", fontWeight: 700,
              fontSize: 15, cursor: "pointer",
            }}>Start 24-hour cooldown</button>
            <button onClick={onCancel} style={{
              marginTop: 10, width: "100%", padding: "12px",
              borderRadius: 10, border: "1px solid #22C55E",
              background: "transparent", color: "#22C55E", cursor: "pointer",
              fontWeight: 700,
            }}>← Actually, I'll keep going.</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Export Report Modal ───────────────────────────────────────────────────────
function ExportModal({ state, onClose }) {
  const today = getTodayStr();
  const daysElapsed = getDaysBetween(state.startDate, today) + 1;
  const streak = calcStreak(state.checkins, state.actions, state.startDate, state.lockDays);
  const consistency = calcConsistency(state.checkins, state.actions, state.startDate, state.lockDays);
  const longest = calcLongestStreak(state.checkins, state.actions, state.startDate, state.lockDays);
  const validActions = state.actions.filter(a => a.trim());
  const totalPossible = Math.max(1, daysElapsed - 1) * validActions.length;
  const totalDone = Object.entries(state.checkins).reduce((acc, [d, dc]) => {
    if (d >= state.startDate && d < today) acc += validActions.filter((_, i) => dc[i]).length;
    return acc;
  }, 0);

  const report = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 LOCKIN 30-DAY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:         ${state.name}
Goal:         ${state.goal}
Category:     ${state.category}
Lock Period:  ${state.startDate} → ${state.endDate}
Days Active:  ${Math.max(1, daysElapsed)} / ${state.lockDays}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STATS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Consistency:      ${consistency}%
Current Streak:   ${streak} days 🔥
Longest Streak:   ${longest} days
Actions Done:     ${totalDone} / ${totalPossible}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DAILY ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${validActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by LockIn · lockin.app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const copy = () => {
    navigator.clipboard.writeText(report);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20,
    }}>
      <div style={{
        background: "#111318", border: "1px solid #1E2128",
        borderRadius: 16, padding: "28px 24px", maxWidth: 500, width: "100%",
        maxHeight: "85vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📄 Your Report</h2>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "#8A8F98",
            fontSize: 20, cursor: "pointer",
          }}>✕</button>
        </div>

        <pre style={{
          background: "#0A0A0A", border: "1px solid #1E2128",
          borderRadius: 10, padding: "16px", fontSize: 12,
          color: "#F0F0F0", lineHeight: 1.8, overflow: "auto",
          fontFamily: "monospace", whiteSpace: "pre-wrap",
        }}>{report}</pre>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={copy} style={{
            flex: 1, padding: "12px", borderRadius: 10,
            background: "#FF4D00", border: "none",
            color: "#fff", fontWeight: 700, cursor: "pointer",
          }}>Copy Report</button>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10,
            background: "transparent", border: "1px solid #1E2128",
            color: "#8A8F98", cursor: "pointer",
          }}>Close</button>
        </div>
        <p style={{ fontSize: 12, color: "#8A8F98", textAlign: "center", marginTop: 12 }}>
          Share on Twitter/LinkedIn to hold yourself accountable 🔥
        </p>
      </div>
    </div>
  );
}

// ── CommitmentContract ────────────────────────────────────────────────────────
function CommitmentContract({ data, onSign }) {
  const [signed, setSigned] = useState(false);
  const [typedName, setTypedName] = useState("");
  const today = getTodayStr();
  const endDate = (() => {
    const d = new Date(today); d.setDate(d.getDate() + data.lockDays);
    return d.toISOString().split("T")[0];
  })();
  const validActions = data.actions.filter(a => a.trim());
  const nameMatch = typedName.trim().toLowerCase() === data.name.trim().toLowerCase();

  const formatDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  if (signed) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0A0A0A", color: "#F0F0F0",
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", margin: "0 0 12px" }}>
            You're locked in.
          </h2>
          <p style={{ color: "#8A8F98", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Contract signed. {data.lockDays} days. No excuses.<br />
            Show up every day. That's the whole deal.
          </p>
          <button onClick={() => onSign(typedName.trim(), today)} style={{
            background: "#FF4D00", color: "#fff", border: "none",
            padding: "16px 40px", borderRadius: 10, fontWeight: 800,
            fontSize: 17, cursor: "pointer",
            boxShadow: "0 0 40px rgba(255,77,0,0.3)",
          }}>Open Dashboard →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A", color: "#F0F0F0",
      fontFamily: "'Inter', 'SF Pro Display', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>
            Lock<span style={{ color: "#FF4D00" }}>In</span>
          </span>
        </div>

        {/* The Contract */}
        <div style={{
          background: "#0D0F12",
          border: "1px solid #FF4D00",
          borderRadius: 16,
          padding: "36px 32px",
          position: "relative",
          boxShadow: "0 0 60px rgba(255,77,0,0.08)",
        }}>
          {/* Watermark */}
          <div style={{
            position: "absolute", top: 16, right: 20,
            fontSize: 11, color: "rgba(255,77,0,0.3)", fontWeight: 700,
            letterSpacing: "2px", textTransform: "uppercase",
          }}>COMMITMENT CONTRACT</div>

          {/* Header rule */}
          <div style={{
            borderBottom: "1px solid #1E2128", paddingBottom: 20, marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, color: "#8A8F98", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
              Effective {formatDate(today)}
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
              I commit to:
            </h2>
          </div>

          {/* Goal */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 26, fontWeight: 900, color: "#FF4D00",
              letterSpacing: "-0.5px", lineHeight: 1.2,
            }}>
              {data.goal}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#8A8F98" }}>
              Category: <span style={{ color: "#F0F0F0", fontWeight: 600 }}>{data.category}</span>
            </div>
          </div>

          {/* Duration */}
          <div style={{
            background: "#111318", borderRadius: 10, padding: "14px 16px",
            marginBottom: 24, display: "flex", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Duration</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{data.lockDays} Days</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Locked Until</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#FF4D00" }}>{formatDate(endDate)}</div>
            </div>
          </div>

          {/* Daily actions */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, color: "#8A8F98", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Daily Actions — Every Single Day
            </div>
            {validActions.map((action, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "10px 0",
                borderBottom: i < validActions.length - 1 ? "1px solid #1E2128" : "none",
              }}>
                <span style={{
                  color: "#FF4D00", fontWeight: 900, fontSize: 15,
                  minWidth: 22, paddingTop: 1,
                }}>{i + 1}.</span>
                <span style={{ fontSize: 15, lineHeight: 1.5 }}>{action}</span>
              </div>
            ))}
          </div>

          {/* Terms */}
          <div style={{
            background: "rgba(255,77,0,0.04)", border: "1px solid rgba(255,77,0,0.15)",
            borderRadius: 8, padding: "14px 16px", marginBottom: 28,
            fontSize: 12, color: "#8A8F98", lineHeight: 1.7,
          }}>
            By signing below, I acknowledge that this commitment is <strong style={{ color: "#F0F0F0" }}>locked and cannot be edited</strong>. 
            Any attempt to quit before {formatDate(endDate)} requires a written acknowledgement and a <strong style={{ color: "#F0F0F0" }}>24-hour cooling-off period</strong>. 
            Missing a day resets my streak. I am doing this for myself.
          </div>

          {/* Signature area */}
          <div style={{ borderTop: "1px solid #1E2128", paddingTop: 24 }}>
            <div style={{ fontSize: 13, color: "#8A8F98", marginBottom: 10 }}>
              Sign your name to activate this contract:
            </div>
            <div style={{ fontSize: 11, color: "#FF4D00", fontWeight: 600, marginBottom: 8, letterSpacing: "0.3px" }}>
              Type exactly: <span style={{ fontFamily: "monospace" }}>{data.name}</span>
            </div>
            <input
              autoFocus
              style={{
                ...sinput,
                fontFamily: "'Georgia', serif",
                fontSize: 18,
                fontStyle: "italic",
                borderColor: nameMatch ? "rgba(34,197,94,0.5)" : "#1E2128",
                marginBottom: 16,
              }}
              placeholder="Your signature..."
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
            />

            {/* Date line */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12, color: "#8A8F98", marginBottom: 20,
            }}>
              <span>Signed: <span style={{ color: nameMatch ? "#22C55E" : "#8A8F98", fontWeight: 600 }}>
                {nameMatch ? typedName.trim() : "_______________"}
              </span></span>
              <span>Date: <span style={{ color: "#F0F0F0", fontWeight: 600 }}>{formatDate(today)}</span></span>
            </div>

            <button
              disabled={!nameMatch}
              onClick={() => setSigned(true)}
              style={{
                width: "100%", padding: "15px", borderRadius: 10, border: "none",
                background: nameMatch
                  ? "linear-gradient(135deg, #FF4D00, #FF7A3D)"
                  : "#1E2128",
                color: nameMatch ? "#fff" : "#8A8F98",
                fontWeight: 900, fontSize: 17,
                cursor: nameMatch ? "pointer" : "not-allowed",
                letterSpacing: "-0.3px",
                boxShadow: nameMatch ? "0 0 30px rgba(255,77,0,0.25)" : "none",
                transition: "all 0.2s",
              }}>
              {nameMatch ? "✍️ Sign & Lock In" : "Sign your name above to continue"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#8A8F98", marginTop: 16 }}>
          This contract is stored in your browser. It cannot be edited after signing.
        </p>
      </div>
    </div>
  );
}

// ── ContractCard — shown on dashboard ────────────────────────────────────────
function ContractCard({ state }) {
  const [expanded, setExpanded] = useState(false);
  const validActions = state.actions.filter(a => a.trim());
  const formatDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{
      background: "#0D0F12", border: "1px solid rgba(255,77,0,0.3)",
      borderRadius: 14, marginBottom: 16, overflow: "hidden",
    }}>
      {/* Header — always visible */}
      <button onClick={() => setExpanded(e => !e)} style={{
        width: "100%", padding: "16px 20px", background: "transparent",
        border: "none", cursor: "pointer", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📜</span>
          <span style={{ color: "#F0F0F0", fontWeight: 700, fontSize: 14 }}>Commitment Contract</span>
          <span style={{
            background: "rgba(34,197,94,0.15)", color: "#22C55E",
            fontSize: 10, fontWeight: 700, padding: "2px 8px",
            borderRadius: 100, letterSpacing: "0.5px", textTransform: "uppercase",
          }}>SIGNED</span>
        </div>
        <span style={{ color: "#8A8F98", fontSize: 12 }}>{expanded ? "▲ Hide" : "▼ View"}</span>
      </button>

      {/* Expanded contract */}
      {expanded && (
        <div style={{
          padding: "0 20px 20px",
          borderTop: "1px solid #1E2128",
        }}>
          <div style={{ paddingTop: 20 }}>
            {/* Goal */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>I commit to</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#FF4D00", letterSpacing: "-0.3px" }}>{state.goal}</div>
            </div>

            {/* Duration */}
            <div style={{
              display: "flex", gap: 20, marginBottom: 16,
              padding: "12px 14px", background: "#111318", borderRadius: 8,
            }}>
              <div>
                <div style={{ fontSize: 10, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Duration</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{state.lockDays} Days</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Start</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(state.startDate)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>End</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#FF4D00" }}>{formatDate(state.endDate)}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Daily Actions</div>
              {validActions.map((a, i) => (
                <div key={i} style={{
                  fontSize: 13, padding: "7px 0",
                  borderBottom: i < validActions.length - 1 ? "1px solid #1E2128" : "none",
                  display: "flex", gap: 10,
                }}>
                  <span style={{ color: "#FF4D00", fontWeight: 700 }}>{i + 1}.</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div style={{
              borderTop: "1px solid #1E2128", paddingTop: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 10, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Signed by</div>
                <div style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 17, color: "#F0F0F0" }}>
                  {state.signedName}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Date</div>
                <div style={{ fontSize: 12, color: "#F0F0F0", fontWeight: 600 }}>{formatDate(state.signedDate)}</div>
              </div>
            </div>

            <div style={{
              marginTop: 14, padding: "10px 12px", borderRadius: 8,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              fontSize: 11, color: "#8A8F98", textAlign: "center",
            }}>
              🔒 This contract is sealed. It cannot be edited or deleted.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onStart }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A", color: "#F0F0F0",
      fontFamily: "'Inter', 'SF Pro Display', sans-serif", display: "flex", flexDirection: "column",
    }}>
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 32px", borderBottom: "1px solid #1E2128",
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>
          Lock<span style={{ color: "#FF4D00" }}>In</span>
        </span>
        <button onClick={onStart} style={{
          background: "#FF4D00", color: "#fff", border: "none",
          padding: "10px 22px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>Start Free</button>
      </nav>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 24px 60px", textAlign: "center",
      }}>
        <div style={{
          display: "inline-block", background: "#1E2128", color: "#FF4D00",
          fontSize: 12, fontWeight: 700, letterSpacing: "1.5px",
          padding: "6px 14px", borderRadius: 100, marginBottom: 28, textTransform: "uppercase",
        }}>Stop Switching. Start Shipping.</div>

        <h1 style={{
          fontSize: "clamp(42px, 8vw, 82px)", fontWeight: 900,
          lineHeight: 1.05, letterSpacing: "-2px", maxWidth: 820, margin: "0 auto 24px",
        }}>
          You don't need more ideas.<br />
          You need to <span style={{ color: "#FF4D00" }}>lock in.</span>
        </h1>

        <p style={{
          fontSize: 18, color: "#8A8F98", maxWidth: 520,
          lineHeight: 1.7, marginBottom: 44,
        }}>
          Pick one goal. Set 3 daily actions. Lock it for 30 days.
          No quitting. No switching. Just showing up.
        </p>

        <button onClick={onStart} style={{
          background: "#FF4D00", color: "#fff", border: "none",
          padding: "16px 40px", borderRadius: 10, fontWeight: 800,
          fontSize: 17, cursor: "pointer", letterSpacing: "-0.3px",
          boxShadow: "0 0 40px rgba(255,77,0,0.35)",
        }}>Lock In Now — It's Free →</button>

        <p style={{ marginTop: 16, fontSize: 13, color: "#8A8F98" }}>
          No sign up. No credit card. Works in your browser.
        </p>

        <div style={{ display: "flex", gap: 48, marginTop: 72, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            ["30 Days", "Default lock duration"],
            ["3 Actions", "Per day. Non-negotiable."],
            ["24 Hours", "Cooldown before you can quit"],
          ].map(([num, label]) => (
            <div key={num} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#FF4D00", letterSpacing: "-1px" }}>{num}</div>
              <div style={{ fontSize: 13, color: "#8A8F98", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: "60px 24px", borderTop: "1px solid #1E2128",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20, maxWidth: 1000, margin: "0 auto", width: "100%",
      }}>
        {[
          { icon: "🎯", title: "Pick a Path", desc: "Job Hunt, Build Apps, Masters Prep, Freelancing, or Upskilling." },
          { icon: "🔒", title: "Decision Lockdown", desc: "Lock for 21–60 days. The app makes quitting painful on purpose." },
          { icon: "✅", title: "3 Daily Actions", desc: "Define 3 small daily actions. Check them off. Miss one = streak reset." },
          { icon: "🔥", title: "Streak + Consistency", desc: "Visual heatmap. Consistency score. 30-day report you can share." },
          { icon: "⏳", title: "Brutal Unlock Flow", desc: "Want to quit? Type your surrender. Then wait 24 hours. Most won't." },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{
            background: "#111318", border: "1px solid #1E2128",
            borderRadius: 12, padding: "22px 18px",
          }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
            <div style={{ color: "#8A8F98", fontSize: 13, lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "50px 24px", borderTop: "1px solid #1E2128" }}>
        <button onClick={onStart} style={{
          background: "transparent", color: "#FF4D00",
          border: "2px solid #FF4D00", padding: "14px 36px",
          borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer",
        }}>Pick your path →</button>
      </div>
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: "", goal: "", category: "", actions: ["", "", ""], lockDays: 30 });

  const updateAction = (i, val) => {
    const a = [...data.actions]; a[i] = val; setData({ ...data, actions: a });
  };

  const canNext = () => {
    if (step === 0) return data.name.trim().length > 1;
    if (step === 1) return data.goal.trim().length > 3 && data.category;
    if (step === 2) return data.actions.filter(a => a.trim()).length >= 1;
    return true;
  };

  const finish = () => {
    const startDate = getTodayStr();
    const end = new Date(); end.setDate(end.getDate() + data.lockDays);
    onComplete({
      ...data, startDate,
      endDate: end.toISOString().split("T")[0],
      checkins: {}, unlockRequestedAt: null, createdAt: Date.now(),
    });
  };

  const steps = [
    <div key="s0">
      <StepHeader step={1} total={4} label="Who are you?" />
      <h2 style={sh2}>What should we call you?</h2>
      <p style={sp}>This is your commitment. Own it.</p>
      <input autoFocus style={sinput} placeholder="Your name" value={data.name}
        onChange={e => setData({ ...data, name: e.target.value })}
        onKeyDown={e => e.key === "Enter" && canNext() && setStep(1)} />
    </div>,

    <div key="s1">
      <StepHeader step={2} total={4} label="Your path" />
      <h2 style={sh2}>What are you locking in on?</h2>
      <p style={sp}>Be specific. "Land a frontend dev job at a startup" beats "get a job".</p>
      <input autoFocus style={{ ...sinput, marginBottom: 16 }}
        placeholder="e.g. Land my first dev job in 30 days"
        value={data.goal} onChange={e => setData({ ...data, goal: e.target.value })} />
      <p style={{ ...sp, marginBottom: 10 }}>Category</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setData({ ...data, category: c })} style={{
            padding: "9px 16px", borderRadius: 8, border: "1px solid",
            borderColor: data.category === c ? "#FF4D00" : "#1E2128",
            background: data.category === c ? "rgba(255,77,0,0.12)" : "#111318",
            color: data.category === c ? "#FF4D00" : "#8A8F98",
            cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>{c}</button>
        ))}
      </div>
    </div>,

    <div key="s2">
      <StepHeader step={3} total={4} label="Daily actions" />
      <h2 style={sh2}>3 things you'll do every day.</h2>
      <p style={sp}>Small, specific, doable in under 3 hours total. Miss one = streak resets.</p>
      {data.actions.map((a, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ color: "#FF4D00", fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
          <input style={{ ...sinput, margin: 0, flex: 1 }}
            placeholder={["e.g. Solve 2 LeetCode problems", "e.g. Apply to 3 jobs", "e.g. Build for 1 hour"][i]}
            value={a} onChange={e => updateAction(i, e.target.value)} />
        </div>
      ))}
    </div>,

    <div key="s3">
      <StepHeader step={4} total={4} label="The lock" />
      <h2 style={sh2}>How long are you locking in?</h2>
      <p style={sp}>You cannot change your goal or quit without a 24-hour cooldown. Choose wisely.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {LOCK_DURATIONS.map(({ label, days, desc }) => (
          <button key={days} onClick={() => setData({ ...data, lockDays: days })} style={{
            padding: "15px 18px", borderRadius: 10, border: "1px solid",
            borderColor: data.lockDays === days ? "#FF4D00" : "#1E2128",
            background: data.lockDays === days ? "rgba(255,77,0,0.1)" : "#111318",
            color: "#F0F0F0", cursor: "pointer", textAlign: "left",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
            <span style={{ color: "#8A8F98", fontSize: 13 }}>{desc}</span>
          </button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A", color: "#F0F0F0",
      fontFamily: "'Inter', 'SF Pro Display', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>
          Lock<span style={{ color: "#FF4D00" }}>In</span>
        </span>
        <div style={{
          background: "#111318", border: "1px solid #1E2128",
          borderRadius: 16, padding: "36px 32px", marginTop: 24,
        }}>
          {steps[step]}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} style={{
                flex: 1, padding: "13px", borderRadius: 10,
                background: "transparent", border: "1px solid #1E2128",
                color: "#8A8F98", cursor: "pointer", fontWeight: 600,
              }}>← Back</button>
            )}
            <button disabled={!canNext()} onClick={() => step < 3 ? setStep(step + 1) : finish()} style={{
              flex: 2, padding: "13px", borderRadius: 10,
              background: canNext() ? "#FF4D00" : "#1E2128",
              border: "none", color: canNext() ? "#fff" : "#8A8F98",
              cursor: canNext() ? "pointer" : "not-allowed",
              fontWeight: 800, fontSize: 16,
            }}>{step < 3 ? "Continue →" : "🔒 Lock In"}</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 100,
              background: i <= step ? "#FF4D00" : "#1E2128", transition: "all 0.3s",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── useCooldownTimer hook ─────────────────────────────────────────────────────
function useCooldownTimer(unlockAvailableAt) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!unlockAvailableAt) { setTimeLeft(null); return; }

    const calc = () => {
      const diff = unlockAvailableAt - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, diff });
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [unlockAvailableAt]);

  return timeLeft;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ state, onCheckin, onUpdate, onHardReset }) {
  const [showUnlock, setShowUnlock] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const today = getTodayStr();
  const yesterday = getYesterday();
  const todayCheckins = state.checkins[today] || {};
  const validActions = state.actions.filter(a => a.trim());
  const allDoneToday = validActions.every((_, i) => todayCheckins[i]);
  const daysElapsed = Math.max(1, getDaysBetween(state.startDate, today) + 1);
  const daysLeft = getDaysBetween(today, state.endDate);
  const isLocked = daysLeft >= 0;
  const progress = Math.min(100, Math.round((daysElapsed / state.lockDays) * 100));

  const streak = calcStreak(state.checkins, state.actions, state.startDate, state.lockDays);
  const consistency = calcConsistency(state.checkins, state.actions, state.startDate, state.lockDays);
  const longest = calcLongestStreak(state.checkins, state.actions, state.startDate, state.lockDays);
  const missedYesterday = wasYesterdayMissed(state.checkins, state.actions) && daysElapsed > 1;

  // Unlock cooldown check
  const unlockAvailableAt = state.unlockRequestedAt;
  const cooldownActive = unlockAvailableAt && Date.now() < unlockAvailableAt;
  const cooldownExpired = unlockAvailableAt && Date.now() >= unlockAvailableAt;
  const cooldownTimer = useCooldownTimer(cooldownActive ? unlockAvailableAt : null);

  const pct = validActions.length
    ? Math.round((validActions.filter((_, i) => todayCheckins[i]).length / validActions.length) * 100)
    : 0;

  const toggleAction = (i) => {
    const updated = { ...state.checkins };
    if (!updated[today]) updated[today] = {};
    updated[today] = { ...updated[today], [i]: !updated[today][i] };
    onCheckin(updated);
  };

  const handleUnlockRequested = (cooldownUntil) => {
    onUpdate({ ...state, unlockRequestedAt: cooldownUntil });
    setShowUnlock(false);
  };

  const handleActualReset = () => {
    onHardReset();
  };

  // Lock days for heatmap
  const heatDays = getLockDays(state.startDate, state.lockDays);

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A", color: "#F0F0F0",
      fontFamily: "'Inter', 'SF Pro Display', sans-serif",
    }}>
      {showUnlock && (
        <UnlockFlow
          state={state}
          onCancel={() => setShowUnlock(false)}
          onUnlockRequested={handleUnlockRequested}
        />
      )}
      {showExport && <ExportModal state={state} onClose={() => setShowExport(false)} />}

      {/* Topbar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 20px", borderBottom: "1px solid #1E2128",
        position: "sticky", top: 0, background: "#0A0A0A", zIndex: 10,
      }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>
          Lock<span style={{ color: "#FF4D00" }}>In</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setShowExport(true)} style={{
            background: "transparent", border: "1px solid #1E2128",
            color: "#8A8F98", padding: "6px 12px", borderRadius: 6,
            cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>📄 Export</button>
          {isLocked ? (
            <button onClick={() => !cooldownActive && setShowUnlock(true)} style={{
              background: "transparent",
              border: `1px solid ${cooldownActive ? "#1E2128" : "rgba(239,68,68,0.4)"}`,
              color: cooldownActive ? "#8A8F98" : "#EF4444",
              padding: "6px 12px", borderRadius: 6,
              cursor: cooldownActive ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
            }}>
              {cooldownActive ? "⏳ Cooldown active" : "🔓 Unlock"}
            </button>
          ) : (
            <button onClick={handleActualReset} style={{
              background: "transparent", border: "1px solid #1E2128",
              color: "#8A8F98", padding: "6px 12px", borderRadius: 6,
              cursor: "pointer", fontSize: 12,
            }}>New Goal</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>

        {/* Missed yesterday banner */}
        {missedYesterday && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "14px 18px", marginBottom: 16,
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <span style={{ fontSize: 20 }}>💔</span>
            <div>
              <div style={{ fontWeight: 700, color: "#EF4444", fontSize: 14 }}>Streak reset. You missed yesterday.</div>
              <div style={{ fontSize: 12, color: "#8A8F98", marginTop: 2 }}>Don't miss today. Start a new streak now.</div>
            </div>
          </div>
        )}

        {/* Cooldown active banner — live countdown */}
        {cooldownActive && (
          <div style={{
            background: "rgba(255,77,0,0.06)", border: "1px solid rgba(255,77,0,0.4)",
            borderRadius: 12, padding: "18px 20px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>⏳</span>
              <div style={{ fontWeight: 700, color: "#FF4D00", fontSize: 14 }}>Unlock cooldown active</div>
            </div>

            {/* Live countdown tiles */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
              {[
                { val: cooldownTimer ? String(cooldownTimer.h).padStart(2, "0") : "00", label: "Hours" },
                { val: cooldownTimer ? String(cooldownTimer.m).padStart(2, "0") : "00", label: "Minutes" },
                { val: cooldownTimer ? String(cooldownTimer.s).padStart(2, "0") : "00", label: "Seconds" },
              ].map(({ val, label }, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    background: "#0A0A0A", border: "1px solid #1E2128",
                    borderRadius: 10, padding: "12px 16px", textAlign: "center", minWidth: 64,
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#FF4D00", fontFamily: "monospace", letterSpacing: "2px" }}>
                      {val}
                    </div>
                    <div style={{ fontSize: 10, color: "#8A8F98", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {label}
                    </div>
                  </div>
                  {i < 2 && <span style={{ color: "#FF4D00", fontWeight: 900, fontSize: 22, marginTop: -12 }}>:</span>}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#8A8F98", textAlign: "center" }}>
              Come back when this hits <span style={{ color: "#F0F0F0", fontWeight: 700 }}>00:00:00</span> — if you still want to quit.
            </div>
          </div>
        )}

        {/* Cooldown expired — allow quit */}
        {cooldownExpired && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 12, padding: "14px 18px", marginBottom: 16,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 700, color: "#EF4444", fontSize: 14 }}>Cooldown expired.</div>
              <div style={{ fontSize: 12, color: "#8A8F98", marginTop: 2 }}>You can now reset. Or keep going — you came this far.</div>
            </div>
            <button onClick={handleActualReset} style={{
              background: "#EF4444", border: "none", color: "#fff",
              padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              fontWeight: 700, fontSize: 13,
            }}>Reset</button>
          </div>
        )}

        {/* Goal card */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 11, color: "#FF4D00", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>
            {state.category} · {isLocked ? "LOCKED 🔒" : "COMPLETE 🎉"}
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.3, marginBottom: 14 }}>
            {state.goal}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#8A8F98" }}>Day {daysElapsed} of {state.lockDays}</span>
            <span style={{ fontSize: 12, color: "#8A8F98" }}>{progress}%</span>
          </div>
          <div style={{ background: "#1E2128", borderRadius: 100, height: 6 }}>
            <div style={{
              width: `${progress}%`, height: "100%", borderRadius: 100,
              background: "linear-gradient(90deg, #FF4D00, #FF7A3D)", transition: "width 0.5s",
            }} />
          </div>
        </div>

        {/* Contract card */}
        {state.signedName && <ContractCard state={state} />}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Streak", value: `${streak}🔥`, sub: "days" },
            { label: "Consistency", value: `${consistency}%`, sub: "all-time" },
            { label: "Longest", value: `${longest}d`, sub: "streak" },
            { label: "Left", value: `${Math.max(0, daysLeft)}d`, sub: "locked" },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              background: "#111318", border: "1px solid #1E2128",
              borderRadius: 12, padding: "14px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "#8A8F98", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>{value}</div>
              <div style={{ fontSize: 10, color: "#8A8F98", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Daily checkins */}
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Today's Actions</h3>
            <span style={{ fontSize: 11, color: "#8A8F98" }}>{today}</span>
          </div>
          {validActions.map((action, i) => {
            const done = !!todayCheckins[i];
            return (
              <div key={i} onClick={() => toggleAction(i)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 14px", borderRadius: 10, marginBottom: 8,
                background: done ? "rgba(34,197,94,0.07)" : "#0A0A0A",
                border: `1px solid ${done ? "rgba(34,197,94,0.25)" : "#1E2128"}`,
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                  background: done ? "#22C55E" : "transparent",
                  border: `2px solid ${done ? "#22C55E" : "#8A8F98"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {done && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 500,
                  color: done ? "#8A8F98" : "#F0F0F0",
                  textDecoration: done ? "line-through" : "none",
                }}>{action}</span>
              </div>
            );
          })}
          {allDoneToday && (
            <div style={{
              marginTop: 12, padding: "13px", borderRadius: 10,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
              textAlign: "center", color: "#22C55E", fontWeight: 700, fontSize: 14,
            }}>🔥 Day complete. Streak lives.</div>
          )}
        </div>

        {/* Heatmap */}
        <div style={{ ...card, marginBottom: 0 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>
            Heatmap — {state.lockDays} Days
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(heatDays.length, 15)}, 1fr)`,
            gap: 5,
          }}>
            {heatDays.map((d) => {
              const dc = state.checkins[d] || {};
              const doneCount = validActions.filter((_, i) => dc[i]).length;
              const isToday = d === today;
              const isFuture = d > today;
              let bg = "#1E2128";
              if (!isFuture && validActions.length > 0) {
                if (doneCount === validActions.length) bg = "#22C55E";
                else if (doneCount > 0) bg = "#F59E0B";
                else if (d < today) bg = "#EF4444";
              }
              return (
                <div key={d} title={d} style={{
                  aspectRatio: "1", borderRadius: 3, background: bg,
                  border: isToday ? "2px solid #FF4D00" : "none",
                  opacity: isFuture ? 0.3 : 1,
                  transition: "all 0.2s",
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            {[["#22C55E","All done"],["#F59E0B","Partial"],["#EF4444","Missed"],["#1E2128","Future"]].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 11, color: "#8A8F98" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#8A8F98", marginTop: 20, marginBottom: 8 }}>
          {state.name} · {streak > 0 ? `${streak} day streak 🔥` : "No active streak. Check in today."} · {consistency}% consistent
        </p>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [state, setState] = useState(null);
  const [pendingData, setPendingData] = useState(null);

  useEffect(() => {
    const saved = loadState();
    if (saved) { setState(saved); setScreen("dashboard"); }
  }, []);

  // Onboarding done → go to contract screen
  const handleOnboardingComplete = (data) => {
    setPendingData(data);
    setScreen("contract");
  };

  // Contract signed → finalize state, go to dashboard
  const handleContractSigned = (signedName, signedDate) => {
    const finalState = { ...pendingData, signedName, signedDate };
    setState(finalState);
    saveState(finalState);
    setPendingData(null);
    setScreen("dashboard");
  };

  const handleCheckin = (checkins) => {
    const updated = { ...state, checkins };
    setState(updated); saveState(updated);
  };
  const handleUpdate = (s) => { setState(s); saveState(s); };
  const handleHardReset = () => {
    localStorage.removeItem("lockin_v2");
    setState(null); setPendingData(null); setScreen("landing");
  };

  if (screen === "landing") return <LandingPage onStart={() => setScreen("onboarding")} />;
  if (screen === "onboarding") return <OnboardingFlow onComplete={handleOnboardingComplete} />;

  if (screen === "contract") return (
    <CommitmentContract data={pendingData} onSign={handleContractSigned} />
  );
  if (screen === "dashboard") return (
    <Dashboard
      state={state}
      onCheckin={handleCheckin}
      onUpdate={handleUpdate}
      onHardReset={handleHardReset}
    />
  );
}
