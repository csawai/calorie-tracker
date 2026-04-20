// Alternative AI parser — uses Anthropic Claude API directly (no AWS needed)
// To use: change import in index.js from './src/parser.js' to './src/parser-claude.js'
// Set secret: wrangler secret put ANTHROPIC_API_KEY

import { PROMPT } from './parser.js';

export async function parseFood(input, env) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: PROMPT(input, timestamp) }]
    })
  });

  if (!res.ok) throw new Error(`Claude: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.content[0].text);
}
