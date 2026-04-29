# Calorie Tracker

> Because tracking calories shouldn't feel like a second job.

---

## The Problem

You know the drill. You eat something, then you:

1. Open some bloated app with 47 tabs
2. Search their database for "homemade dal" (good luck)
3. Guess the portion size from a dropdown that only has "small / medium / large"
4. Manually pick breakfast/lunch/dinner
5. Repeat for every single item
6. Do this 4x a day
7. Give up by Thursday

It's exhausting. You're not tracking calories its more like you're doing data entry. And the moment it feels like work, you stop.

---

## The Fix

```bash
f had dal rice and 1 roti for lunch
✅ lunch: dal (150cal, 9g P), rice (130cal, 3g P), roti (99cal, 3g P)
```

That's it. Type what you ate, in your own words. AI figures out the food, estimates macros, detects the meal, and logs it to a Google Sheet. No app. No dropdowns. No friction.

Check your day:
```bash
f today
📊 Today (2026-04-20)
Calories: 872 | Protein: 79g | Fat: 33g | Carbs: 56g
Meals: breakfast, lunch (5 items)
```

---

## ✨ Features

- **Natural language** — "had 2 eggs and chai for breakfast" just works
- **Multi-meal** — "eggs for breakfast and chicken rice for lunch" logs both
- **Auto meal detection** — skip the meal name, it infers from time of day
- **Full macros** — calories, protein, fat, carbs per item
- **Google Sheets** — your data, your sheet, forever accessible
- **Daily dashboard** — auto-calculated totals & protein %
- **Terminal-first** — works from Mac, Linux, or any shell
- **iOS** — works via Apple Shortcuts (see below)
- **Modular** — swap AI provider, storage, or add commands in minutes
- **Self-hosted** — your keys, your data, your instance

---

## 📖 Commands

```bash
f <what you ate>          # log food
f today                   # daily summary
f undo                    # delete last entry
f week                    # 7-day averages
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Why |
|------|-----|
| [Node.js](https://nodejs.org/) | To run wrangler CLI |
| [Cloudflare account](https://cloudflare.com) (free) | Hosts the worker |
| [Google Cloud project](https://console.cloud.google.com) | Sheets API access |
| AI provider key | Pick one: AWS / Claude / OpenAI |

### Install

```bash
npm install -g wrangler
wrangler login

git clone https://github.com/csawai/calorie-tracker.git
cd calorie-tracker
```

---

## 🤖 Choose Your AI Provider

<details>
<summary><b>Option A: AWS Bedrock</b> (default, cheapest at scale)</summary>

No code changes needed.

```bash
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
```

Requirements:
- IAM user with `bedrock:InvokeModel` permission
- Claude Haiku enabled in [Bedrock console](https://console.aws.amazon.com/bedrock/) (us-east-1)

Change model in `wrangler.toml`:
```toml
BEDROCK_MODEL = "anthropic.claude-3-haiku-20240307-v1:0"
```

</details>

<details>
<summary><b>Option B: Anthropic Claude</b> (direct API, simplest)</summary>

Edit `index.js` line 4:
```js
import { parseFood } from './src/parser-claude.js';
```

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Get your key → [console.anthropic.com](https://console.anthropic.com/)

</details>

<details>
<summary><b>Option C: OpenAI</b> (GPT-4o-mini)</summary>

Edit `index.js` line 4:
```js
import { parseFood } from './src/parser-openai.js';
```

```bash
wrangler secret put OPENAI_API_KEY
```

Get your key → [platform.openai.com](https://platform.openai.com/)

</details>

---

## 📊 Google Sheets Setup

1. **Create a Service Account**
   - [Google Cloud Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
   - Create new → Keys → Add Key → JSON → Download

2. **Enable Sheets API**
   - [APIs & Services → Library](https://console.cloud.google.com/apis/library/sheets.googleapis.com) → Enable

3. **Create & Share Your Sheet**
   - Create a new [Google Sheet](https://sheets.new)
   - Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/THIS_PART/edit`
   - Share with your service account email (`client_email` in the JSON) → Editor access

4. **Set Secrets**
   ```bash
   wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
   # paste entire JSON contents

   wrangler secret put SPREADSHEET_ID
   # paste the ID from your sheet URL
   ```

5. **Initialize Sheet**
   ```bash
   node setup-sheet.js /path/to/service-account.json YOUR_SPREADSHEET_ID
   ```

---

## 🚢 Deploy

```bash
wrangler deploy
```

You'll get: `https://calorie-tracker.<your-subdomain>.workers.dev`

---

## 💻 Terminal Setup

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export CALORIE_TRACKER_URL="https://calorie-tracker.<your-subdomain>.workers.dev"
alias f="/path/to/calorie-tracker/ate.sh"
```

```bash
source ~/.zshrc
```

---

## 📱 iOS Setup (Apple Shortcuts)

1. Open **Shortcuts** → tap **+**
2. Add these actions:

```
Ask for Input → Prompt: "What did you eat?"
Get Contents of URL → POST to your worker URL, Body: [Provided Input]
Show Result → [Contents of URL]
```

3. Name it "Log Food" → Add to Home Screen
4. Say "Hey Siri, Log Food" to use voice

---

## 🏗️ Architecture

```
You (terminal / iOS / anything with HTTP)
  → Cloudflare Worker (free, serverless)
    → AI parses natural language → structured JSON
    → Google Sheets API appends rows
  ← Confirmation with calories & macros
```

```
calorie-tracker/
├── index.js              ← Router (40 lines)
├── src/
│   ├── parser.js         ← AWS Bedrock (default)
│   ├── parser-claude.js  ← Anthropic direct
│   ├── parser-openai.js  ← OpenAI
│   ├── sheets.js         ← Google Sheets client
│   ├── aws.js            ← AWS Signature V4
│   └── commands.js       ← today, undo, week
├── ate.sh                ← Terminal script
├── setup-sheet.js        ← One-time sheet setup
└── wrangler.toml         ← Config
```

---

## 🔧 Customization

| What | How |
|------|-----|
| Swap AI provider | Change import in `index.js` |
| Change model | Edit `wrangler.toml` or env vars |
| Add commands | Export a function in `src/commands.js` |
| Change storage | Replace `src/sheets.js` (Notion, Airtable, etc.) |
| Change timezone | Replace `Asia/Kolkata` with yours |

---

## ⚡ Cost

| Component | Cost |
|-----------|------|
| Cloudflare Worker | Free (100k req/day) |
| Google Sheets API | Free |
| AI per log entry | ~$0.001 |

Basically free for personal use.

---

## License

MIT - Do whatever the "f" you want. 

---

<p align="center">
  <i>Built because every calorie app is either too complicated, too ugly, or too expensive.</i><br>
  <b>Just type what you ate. Done.</b>
</p>
