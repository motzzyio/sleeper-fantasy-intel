# 🏈 Sleeper Fantasy Intel

An AI-powered fantasy football assistant for your Sleeper leagues. Built with Next.js + Claude AI.

## Features

- **Draft Tab** — Historical position tendency heatmap, R1 picks across seasons, AI draft advisor
- **In-Season Tab** — Live matchup score, trending adds, recent transactions, AI advisor (Waivers / Start-Sit / Trades / Injuries & Byes)
- **Standings Tab** — Full league standings + points-for visual bar chart

---

## 🚀 Deploy to Vercel (Recommended — Free)

### Prerequisites
- A [GitHub](https://github.com) account (free)
- A [Vercel](https://vercel.com) account (free) — sign in with GitHub
- An [Anthropic API key](https://console.anthropic.com) — create one at console.anthropic.com

---

### Step 1 — Get the code onto GitHub

**Option A: Upload via GitHub web UI (easiest)**

1. Go to [github.com](https://github.com) and click **New repository**
2. Name it `sleeper-fantasy-intel`, set it to **Private**, click **Create repository**
3. On the next screen, click **uploading an existing file**
4. Drag and drop the entire contents of this project folder into the upload area
5. Click **Commit changes**

**Option B: Use Git in terminal**
```bash
cd sleeper-fantasy
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sleeper-fantasy-intel.git
git push -u origin main
```

---

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New → Project**
2. Click **Import** next to your `sleeper-fantasy-intel` repository
3. Vercel will auto-detect it as a Next.js project — leave all settings as default
4. Before clicking Deploy, click **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | your key from console.anthropic.com |

5. Click **Deploy**
6. Wait ~60 seconds — Vercel builds and deploys automatically
7. Click the generated URL (e.g. `sleeper-fantasy-intel.vercel.app`) — your app is live!

---

### Step 3 — Use the app

1. Open your Vercel URL
2. Enter your Sleeper username (`motzzy` is pre-filled)
3. The app fetches your live league data and loads all tabs
4. Hit **Analyse** on any tab to get AI-powered insights

---

## 🔑 Getting an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys** in the sidebar
4. Click **Create Key**, copy it
5. Paste it as the `ANTHROPIC_API_KEY` environment variable in Vercel

> **Cost:** The AI analysis uses Claude Sonnet. Each "Analyse" button press costs roughly $0.01–0.02. For casual use, $5 of API credit lasts a very long time.

---

## 🔄 Running Locally (Optional)

```bash
# Install dependencies
npm install

# Create your env file
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
src/
  app/
    page.tsx              # Entry page (username input)
    layout.tsx            # Root layout
    globals.css           # Global styles
    api/
      sleeper/route.ts    # Server-side Sleeper API proxy (bypasses CORS)
      ai/route.ts         # Claude AI analysis endpoint
  components/
    Dashboard.tsx         # Main orchestration + data fetching
    DraftTab.tsx          # Draft analysis + AI advisor
    InSeasonTab.tsx       # In-season management + AI advisor
    StandingsTab.tsx      # League standings + visualisation
    ui.tsx                # Shared UI components
  lib/
    api.ts                # Client-side API helpers
    types.ts              # TypeScript types
```

---

## Updating the Default Username

The app pre-fills `motzzy` as the username. To change it, edit line 5 of `src/app/page.tsx`:

```tsx
const [input, setInput] = useState("motzzy"); // ← change this
```

---

## Redeploying After Changes

Any push to your `main` branch on GitHub will automatically trigger a redeploy on Vercel. No manual steps needed.
