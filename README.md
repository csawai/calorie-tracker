# 🍕 Calorie Tracker

Type what you ate → AI parses calories & macros → logs to Google Sheets.

```
f had 2 eggs and chai for breakfast
✅ breakfast: eggs (140cal, 12g P), chai (30cal, 1g P)
```

Works from any terminal. No app needed.

## Commands

```bash
f <what you ate>          # log food
f today                   # daily summary
f undo                    # delete last entry
f week                    # 7-day averages
```

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- A [Cloudflare](https://cloudflare.com) account (free)
- A [Google Cloud](https://console.cloud.google.com) service account with Sheets API enabled
- An AI provider key (pick one below)

```bash
npm install -g wrangler
wrangler login
```

### 1. Clone & deploy

```bash
git clone https://github.com/csawai/calorie-tracker.git
cd calorie-tracker
```

### 2. Pick your AI provider

#### Option A: AWS Bedrock (default)

No code changes needed. Set secrets:

```bash
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
```

Your IAM user needs `bedrock:InvokeModel` permission. Enable Claude Haiku in the [Bedrock console](https://console.aws.amazon.com/bedrock/).

#### Option B: Anthropic Claude (direct API)

Edit `index.js` — change the import:

```js
import { parseFood } from './src/parser-claude.js';
```

Set secret:

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Get your key at [console.anthropic.com](https://console.anthropic.com/).

#### Option C: OpenAI

Edit `index.js` — change the import:

```js
import { parseFood } from './src/parser-openai.js';
```

Set secret:

```bash
wrangler secret put OPENAI_API_KEY
```

Get your key at [platform.openai.com](https://platform.openai.com/).

### 3. Google Sheets

1. Create a [service account](https://console.cloud.google.com/iam-admin/serviceaccounts) and download the JSON key
2. Enable the [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
3. Create a new Google Sheet
4. Share the sheet with your service account email (the `client_email` in the JSON)
5. Set secrets:

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# paste the entire JSON key file contents when prompted

wrangler secret put SPREADSHEET_ID
# from your sheet URL: https://docs.google.com/spreadsheets/d/THIS_PART/edit
```

### 4. Set up the sheet

```bash
node setup-sheet.js /path/to/service-account.json YOUR_SPREADSHEET_ID
```

This creates a `Log` tab with headers and a `Daily` tab with auto-calculating formulas.

### 5. Deploy

```bash
wrangler deploy
```

You'll get a URL like `https://calorie-tracker.<you>.workers.dev`

### 6. Terminal alias

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export CALORIE_TRACKER_URL="https://calorie-tracker.<you>.workers.dev"
alias f="~/path/to/calorie-tracker/ate.sh"
```

Then `source ~/.zshrc` and you're done.

## Sheet Structure

**Log tab** — one row per food item:

| Date | Time | Meal | Food | Qty | Calories | Protein | Fat | Carbs |
|------|------|------|------|-----|----------|---------|-----|-------|

**Daily tab** — auto-calculated per day:

| Date | Calories | Protein | Fat | Carbs | Meals | Protein % |
|------|----------|---------|-----|-------|-------|-----------|

## Customization

- **AI provider**: swap `src/parser-*.js` (see above)
- **Commands**: add your own in `src/commands.js` — export a function that takes `(env)` and returns a string
- **Storage**: swap `src/sheets.js` with your own backend (Notion, Airtable, etc.)
- **Model**: change `BEDROCK_MODEL` in `wrangler.toml` or set `OPENAI_MODEL`/`ANTHROPIC_MODEL` env vars

## Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — serverless runtime
- [AWS Bedrock](https://aws.amazon.com/bedrock/) / [Anthropic](https://anthropic.com) / [OpenAI](https://openai.com) — AI parsing
- [Google Sheets API](https://developers.google.com/sheets/api) — storage

## License

MIT
