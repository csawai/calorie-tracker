// Commands — today, undo, week
// Add your own commands by exporting a function that takes (env) and returns a string.

import { readRows, deleteRow } from './sheets.js';

function todayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// f today — daily summary
export async function today(env) {
  const rows = await readRows(`${env.SHEET_NAME}!A:I`, env);
  const date = todayDate();
  const todayRows = rows.filter(r => r[0] === date);

  if (!todayRows.length) return '📭 Nothing logged today.';

  let cal = 0, pro = 0, fat = 0, carb = 0;
  const meals = new Set();
  const items = [];

  for (const r of todayRows) {
    meals.add(r[2]);
    items.push(`  ${r[2]}: ${r[3]} (${r[5]} cal, ${r[6]}g P)`);
    cal += Number(r[5]) || 0;
    pro += Number(r[6]) || 0;
    fat += Number(r[7]) || 0;
    carb += Number(r[8]) || 0;
  }

  return [
    `📊 Today (${date})`,
    `Calories: ${cal} | Protein: ${pro}g | Fat: ${fat}g | Carbs: ${carb}g`,
    `Meals: ${[...meals].join(', ')} (${todayRows.length} items)`,
    '',
    ...items
  ].join('\n');
}

// f undo — delete last entry
export async function undo(env) {
  const rows = await readRows(`${env.SHEET_NAME}!A:I`, env);
  if (rows.length <= 1) return '❌ Nothing to undo.';

  const last = rows[rows.length - 1];
  await deleteRow(rows.length - 1, env);
  return `🗑️ Removed: ${last[3]} (${last[2]}, ${last[5]} cal)`;
}

// f week — 7-day averages
export async function week(env) {
  const rows = await readRows(`${env.SHEET_NAME}!A:I`, env);
  const now = new Date();
  const days = {};

  for (const r of rows.slice(1)) {
    const d = r[0];
    if (!d) continue;
    const diff = (now - new Date(d + 'T00:00:00+05:30')) / 86400000;
    if (diff > 7 || diff < 0) continue;
    if (!days[d]) days[d] = { cal: 0, pro: 0, fat: 0, carb: 0 };
    days[d].cal += Number(r[5]) || 0;
    days[d].pro += Number(r[6]) || 0;
    days[d].fat += Number(r[7]) || 0;
    days[d].carb += Number(r[8]) || 0;
  }

  const n = Object.keys(days).length;
  if (!n) return '📭 No data in the last 7 days.';

  const totals = Object.values(days).reduce((a, b) => ({
    cal: a.cal + b.cal, pro: a.pro + b.pro, fat: a.fat + b.fat, carb: a.carb + b.carb
  }));

  const lines = [`📈 Last 7 days (${n} days logged)`,
    `Avg: ${Math.round(totals.cal / n)} cal | ${Math.round(totals.pro / n)}g P | ${Math.round(totals.fat / n)}g F | ${Math.round(totals.carb / n)}g C`,
    ''];

  for (const [d, v] of Object.entries(days).sort().reverse()) {
    lines.push(`  ${d}: ${v.cal} cal, ${v.pro}g P, ${v.fat}g F, ${v.carb}g C`);
  }

  return lines.join('\n');
}

export const COMMANDS = { today, undo, week };
