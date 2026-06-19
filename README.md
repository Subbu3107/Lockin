# 🔒 LockIn

> **Stop switching. Start shipping.**

LockIn is a goal-commitment and daily consistency tracking app built for freshers who are tired of switching ideas, losing streaks, and never following through.

Pick one goal. Lock it for 30 days. Show up every day. Try to quit — the app makes you wait 24 hours first.

---

## 🚀 Live Demo

👉 [lockin.vercel.app](https://lockin-1yldqy6tf-subbu3107s-projects.vercel.app)

---

## 💡 Why I Built This

I was a fresher drowning in options — apply for jobs, build apps, go for masters, freelance. I'd start something, lose consistency after 3 days, and switch to the next thing.

The problem wasn't motivation. It was that I never committed to one path long enough to see results.

So I built LockIn — and on the first day, it stopped me from quitting my own app.

That's the feature.

---

## ✨ Features

### 🎯 Path Picker
Choose your goal and category — Job Hunt, Build Apps, Masters Prep, Freelancing, or Upskilling. Write it specifically. "Land a frontend dev job at a startup" beats "get a job".

### 📜 Commitment Contract
Before you start, you sign a digital contract with your name and date. The contract is sealed — it cannot be edited after signing. It lives on your dashboard as a permanent reminder of what you agreed to.

### 🔒 Decision Lockdown
Lock your goal for 21, 30, or 60 days. You cannot change your goal or quit without going through the unlock flow.

### ✅ Daily Actions
Define 3 small daily actions. Check them off every day. Miss a day — streak resets. No hiding from inactivity.

### 🔥 Streak + Consistency Score
- Live streak counter
- All-time consistency percentage
- Longest streak tracker
- Missed yesterday? Red banner. Streak gone.

### 📊 Heatmap
A visual grid of every day in your lock period — green (all done), yellow (partial), red (missed). You can see exactly how consistent you've been.

### ⏳ Brutal Unlock Flow
Want to quit before the lock ends? You go through 4 steps:
1. **Why?** — Wrong path or just hard?
2. **Type it** — Must type `I am giving up on my commitment.` exactly
3. **Face your stats** — Streak, consistency, days invested shown back to you
4. **24-hour cooldown** — Live countdown timer. Come back tomorrow if you still want to quit.

Most people won't.

### 📄 Export Report
Generate a full 30-day report with your goal, consistency %, streak, longest streak, and daily actions. Copy and share it anywhere.

---

## 🛠 Tech Stack

- **React** — UI
- **Vite** — Build tool
- **localStorage** — Data persistence (no backend, no account needed)
- **Vercel** — Deployment

---

## 📦 Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/lockin.git
cd lockin
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 🏗 Roadmap

- [ ] Supabase auth + cloud sync (so data survives browser clears)
- [ ] Mobile PWA (install on home screen)
- [ ] Email reminders (daily check-in nudge)
- [ ] Streak freeze (1 per lock period)
- [ ] Accountability rooms

---

## 🤝 Contributing

This is an open project. If you're a fresher who relates to the problem — PRs welcome.

---

## 📄 License

MIT

---

Built by [@subbu3107](https://github.com/subbu3107) — a fresher who got tired of switching ideas.
