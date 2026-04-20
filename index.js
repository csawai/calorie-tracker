// Calorie Tracker — Cloudflare Worker
// POST text → AI parses food → logs to Google Sheets
// Commands: today, undo, week

import { parseFood } from './src/parser.js';
import { appendRows } from './src/sheets.js';
import { COMMANDS } from './src/commands.js';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('POST food log or command (today, undo, week)', { status: 405 });
    }

    const input = (await request.text()).trim();
    if (!input) return new Response('Empty input', { status: 400 });

    try {
      // Check if input is a command
      const cmd = input.toLowerCase();
      if (COMMANDS[cmd]) {
        return new Response(await COMMANDS[cmd](env));
      }

      // Otherwise, parse as food
      const foods = await parseFood(input, env);
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const time = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      const rows = foods.map(f => [today, time, f.meal.toLowerCase(), f.food, f.qty, f.calories, f.protein_g, f.fat_g, f.carbs_g]);

      await appendRows(rows, env);

      const summary = foods.map(f => `${f.food} (${f.calories}cal, ${f.protein_g}g P)`).join(', ');
      const meals = [...new Set(foods.map(f => f.meal))].join('+');
      return new Response(`✅ ${meals}: ${summary}`);
    } catch (e) {
      return new Response(`❌ ${e.message}`, { status: 500 });
    }
  }
};
