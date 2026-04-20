# 🔥 Calorie Tracker

> Type what you ate. That's it. AI handles the rest.

A dead-simple calorie & macro tracker that lives in your terminal. No apps, no UI, no friction — just type and go.

```bash
$ f had 2 eggs and chai for breakfast
✅ breakfast: eggs (140cal, 12g P), chai (30cal, 1g P)

$ f today
📊 Today (2026-04-20)
Calories: 872 | Protein: 79g | Fat: 33g | Carbs: 56g
Meals: breakfast, lunch (5 items)

  breakfast: egg (214 cal, 18.6g P)
  breakfast: butter (102 cal, 0.1g P)
  lunch: chicken (284 cal, 53.8g P)
  lunch: rice (173 cal, 3.5g P)
  lunch: chapati (99 cal, 3g P)
```

---

## ✨ Features

- **Natural language** — write however you want: "had dal rice for lunch", "2 eggs butter toast breakfast"
- **Multi-meal parsing** — "eggs for breakfast and chicken rice for lunch" logs both correctly
- **Auto meal detection** — skip the meal name, it infers from time of day
- **Macro tracking** — calories, protein, fat, carbs per item
- **Daily dashboard** — auto-calculated Google Sheet with daily totals & protein %
- **Terminal commands** — `today`, `undo`, `week` built in
- **Modular** — swap AI provider, storage backend, or add commands in minutes

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
# 1. Install wrangler & login
npm install -g wrangler
wrangler login

# 2. Clone
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

#### 1. Create a Service Account

1. Go to [Google Cloud Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create a new service account
3. Click it → Keys → Add Key → JSON → Download

#### 2. Enable Sheets API

Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library/sheets.googleapis.com) → Enable **Google Sheets API**

#### 3. Create & Share Your Sheet

1. Create a new [Google Sheet](https://sheets.new)
2. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/COPY_THIS_PART/edit
   ```
3. Share the sheet with your service account email (found in the JSON as `client_email`) — give it **Editor** access

#### 4. Set Secrets

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# → paste entire JSON file contents when prompted

wrangler secret put SPREADSHEET_ID
# → paste the ID from your sheet URL
```

#### 5. Initialize Sheet Structure

```bash
node setup-sheet.js /path/to/your-service-account.json YOUR_SPREADSHEET_ID
```

This creates:
- **Log** tab — raw food entries (Date, Time, Meal, Food, Qty, Calories, Protein, Fat, Carbs)
- **Daily** tab — auto-calculated daily totals with protein %

---

## 🚢 Deploy

```bash
wrangler deploy
```

You'll get:
```
https://calorie-tracker.<your-subdomain>.workers.dev
```

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

Done. Type `f` and eat.

---

## 📖 Usage

```bash
# Log food
f 3 eggs and toast for breakfast
f chicken biryani for lunch
f protein shake banana milk for dinner
f some almonds                          # auto-detects meal from time

# Multi-meal in one go
f eggs for breakfast and dal rice chapati for lunch

# Commands
f today                                 # today's summary
f undo                                  # remove last entry
f week                                  # 7-day averages
```

---

## 🏗️ Architecture

```
Terminal (curl)
  → Cloudflare Worker
    → AI (parses food → structured JSON)
    → Google Sheets (appends row)
  ← Response
```

```
calorie-tracker/
├── index.js              ← Router (40 lines)
├── src/
│   ├── parser.js         ← AWS Bedrock parser (default)
│   ├── parser-claude.js  ← Anthropic direct parser
│   ├── parser-openai.js  ← OpenAI parser
│   ├── sheets.js         ← Google Sheets read/write/delete
│   ├── aws.js            ← AWS Signature V4 signing
│   └── commands.js       ← today, undo, week
├── ate.sh                ← Terminal script
├── setup-sheet.js        ← One-time sheet initializer
└── wrangler.toml         ← Config
```

---

## 🔧 Customization

| What | How |
|------|-----|
| Swap AI provider | Change import in `index.js` (see above) |
| Change model | Edit `wrangler.toml` or set env vars (`OPENAI_MODEL`, `ANTHROPIC_MODEL`) |
| Add commands | Export a function in `src/commands.js` that takes `(env)` → returns string |
| Change storage | Replace `src/sheets.js` with your own (Notion, Airtable, Supabase, etc.) |
| Change timezone | Search for `Asia/Kolkata` and replace with yours |

### Adding a Custom Command

```js
// src/commands.js
export async function goal(env) {
  const data = await today(env);
  const remaining = 2000 - data.calories;
  return `🎯 ${remaining} cal remaining today`;
}

// Don't forget to add it to COMMANDS:
export const COMMANDS = { today, undo, week, goal };
```

---

## 📱 iOS (coming soon)

Use Apple Shortcuts:
1. Create a shortcut with "Ask for Input" → "Get Contents of URL" (POST to your worker URL)
2. Show the response

---

## 🧠 How It Works

1. You type: `"had 2 eggs and chai for breakfast"`
2. Worker sends it to AI with a structured prompt
3. AI returns: `[{food: "eggs", calories: 140, protein_g: 12, ...}, {food: "chai", ...}]`
4. Worker appends rows to Google Sheets
5. You get: `✅ breakfast: eggs (140cal, 12g P), chai (30cal, 1g P)`

The AI estimates calories/macros based on common nutritional data. It's approximate but consistent — good enough for tracking trends.

---

## ⚡ Cost

| Component | Cost |
|-----------|------|
| Cloudflare Worker | Free (100k requests/day) |
| Google Sheets API | Free (300 requests/min) |
| Claude Haiku (Bedrock) | ~$0.001 per log entry |
| Claude Haiku (direct) | ~$0.001 per log entry |
| GPT-4o-mini | ~$0.001 per log entry |

Basically free for personal use.

---

## License

MIT — do whatever you want with it.

---

<p align="center">
  Built with frustration at every calorie tracking app being too complicated.<br>
  <b>Just type what you ate. Done.</b>
</p>
