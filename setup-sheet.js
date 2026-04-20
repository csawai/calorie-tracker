#!/usr/bin/env node
// Sets up the Google Sheet: renames tab to "Log", adds headers, creates "Daily" tab with formulas, migrates old data.
// Usage: node setup-sheet.js /path/to/service-account.json SPREADSHEET_ID

const crypto = require('crypto');
const SA_PATH = process.argv[2] || process.env.GOOGLE_SA_PATH;
const SPREADSHEET_ID = process.argv[3] || process.env.SPREADSHEET_ID;

if (!SA_PATH) { console.error('Usage: node setup-sheet.js /path/to/sa.json [SPREADSHEET_ID]'); process.exit(1); }

const sa = require(SA_PATH.startsWith('/') ? SA_PATH : require('path').resolve(SA_PATH));

let _token;
async function getToken() {
  if (_token) return _token;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  })).toString('base64url');
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${header}.${payload}.${sig}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  _token = data.access_token;
  return _token;
}

async function api(path, body, method = 'POST') {
  const token = await getToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  // Get current sheet info
  const info = await api('', null, 'GET');
  const sheets = info.sheets.map(s => ({ id: s.properties.sheetId, title: s.properties.title }));
  console.log('Current tabs:', sheets.map(s => s.title).join(', '));

  const requests = [];

  // Rename first sheet to "Log" if needed
  const firstSheet = sheets[0];
  if (firstSheet.title !== 'Log') {
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: firstSheet.id, title: 'Log' },
        fields: 'title'
      }
    });
  }

  // Delete "Daily" tab if it exists (we'll recreate it)
  const dailySheet = sheets.find(s => s.title === 'Daily');
  if (dailySheet) {
    requests.push({ deleteSheet: { sheetId: dailySheet.id } });
  }

  // Create "Daily" tab
  requests.push({
    addSheet: {
      properties: { title: 'Daily', index: 1 }
    }
  });

  if (requests.length) await api(':batchUpdate', { requests });
  console.log('✅ Tabs set up: Log + Daily');

  // Clear the Log sheet and write headers + old data
  const headers = ['Date', 'Time', 'Meal', 'Food', 'Qty', 'Calories', 'Protein', 'Fat', 'Carbs'];

  const oldData = [
    ['2026-04-19', '', 'dinner', 'Dymatize Whey Protein', '1 scoop 36g', 130, 25, 2, 3],
    ['2026-04-19', '', 'dinner', 'Banana', '1 medium', 89, 1, 0, 23],
    ['2026-04-19', '', 'dinner', 'Milk', '50ml', 33, 2, 2, 2],
    ['2026-04-19', '', 'breakfast', 'Eggs', '3 whole', 210, 18, 15, 1],
    ['2026-04-19', '', 'breakfast', 'Butter', '1 tbsp', 102, 0, 12, 0],
    ['2026-04-19', '', 'lunch', 'Mutton', '100g', 143, 20, 6, 0],
    ['2026-04-19', '', 'lunch', 'Rice', '50g cooked', 65, 1, 0, 14],
    ['2026-04-19', '', 'lunch', 'Butter Roti', '1 roti', 150, 3, 5, 17],
  ];

  // Clear Log sheet
  await api(`/values/Log!A:I:clear`, {});

  // Write headers + old data
  await api(`/values/Log!A1:I${oldData.length + 1}?valueInputOption=USER_ENTERED`, {
    values: [headers, ...oldData]
  }, 'PUT');
  console.log(`✅ Log: headers + ${oldData.length} old rows written`);

  // Set up Daily tab with formulas
  // Row 1: headers, Row 2+: formulas for each date (we'll do a dynamic approach with UNIQUE)
  const dailyHeaders = ['Date', 'Calories', 'Protein', 'Fat', 'Carbs', 'Meals', 'Protein %'];
  const dailyFormulas = [
    dailyHeaders,
    // Row 2: sorted unique dates from Log, descending (most recent first)
    [
      '=IFERROR(INDEX(SORT(UNIQUE(Log!A2:A),1,FALSE),ROW()-1),"")',
      '=IF(A2="","",SUMIF(Log!A:A,A2,Log!F:F))',
      '=IF(A2="","",SUMIF(Log!A:A,A2,Log!G:G))',
      '=IF(A2="","",SUMIF(Log!A:A,A2,Log!H:H))',
      '=IF(A2="","",SUMIF(Log!A:A,A2,Log!I:I))',
      '=IF(A2="","",COUNTA(UNIQUE(FILTER(Log!C:C,Log!A:A=A2))))',
      '=IF(A2="","",IF(B2>0,ROUND(C2*4/B2*100)&"%",""))',
    ],
  ];

  // Write 30 rows of formulas (auto-extends as you add dates)
  const dailyRows = [dailyFormulas[0]];
  for (let i = 2; i <= 31; i++) {
    dailyRows.push(dailyFormulas[1].map(f => f.replace(/ROW\(\)-1/g, `ROW()-1`)));
  }

  await api(`/values/Daily!A1:G31?valueInputOption=USER_ENTERED`, {
    values: dailyRows
  }, 'PUT');
  console.log('✅ Daily tab: formulas set for 30 days');

  console.log('\n🎉 Done! Open your sheet and check both tabs.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
