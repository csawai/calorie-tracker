# Calorie Tracker

Type what you ate → AI parses it → logs to Google Sheets.

```
ate had 2 eggs and chai for breakfast
✅ breakfast: Eggs (140cal, 12g protein), Chai (30cal, 1g protein)
```

## Setup

### 1. Google Sheets

1. Create a new Google Sheet
2. Name the first tab `Log`
3. Add headers in row 1: `Date | Time | Meal | Food | Qty | Calories | Protein | Carbs | Fat | Raw Input`
4. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`

### 2. Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create a Service Account → download the JSON key
3. Enable the Google Sheets API for your project
4. Share your spreadsheet with the service account email (the `client_email` in the JSON)

### 3. AWS (Bedrock)

You need an IAM user/role with `bedrock:InvokeModel` permission in us-east-1 (or your preferred region).

Make sure Claude Haiku is enabled in your Bedrock console.

### 4. Deploy

```bash
cd calorie-tracker
npm install wrangler -g  # if you don't have it

# Set secrets
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put SPREADSHEET_ID
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# ^ paste the entire JSON file contents when prompted

# Deploy
wrangler deploy
```

### 5. Terminal Alias

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export CALORIE_TRACKER_URL="https://calorie-tracker.<your-subdomain>.workers.dev"
alias ate='~/calorie-tracker/ate.sh'
```

Then: `source ~/.zshrc`

## Usage

```bash
ate had 2 eggs and toast for breakfast
ate chicken biryani for lunch
ate a banana and some almonds
ate pizza and beer for dinner
```

If you don't mention a meal, it infers from current time.

## Sheet Formulas (optional)

Add these in a separate "Dashboard" tab:

| What | Formula |
|------|---------|
| Today's calories | `=SUMIF(Log!A:A, TODAY(), Log!F:F)` |
| Today's protein | `=SUMIF(Log!A:A, TODAY(), Log!G:G)` |
| Today's carbs | `=SUMIF(Log!A:A, TODAY(), Log!H:H)` |
| Today's fat | `=SUMIF(Log!A:A, TODAY(), Log!I:I)` |
| Breakfast cals today | `=SUMIFS(Log!F:F, Log!A:A, TODAY(), Log!C:C, "breakfast")` |
