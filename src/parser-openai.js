// Alternative AI parser — uses OpenAI API instead of AWS Bedrock
// To use: change import in index.js from './src/parser.js' to './src/parser-openai.js'
// Set secret: wrangler secret put OPENAI_API_KEY

import { PROMPT } from './parser.js';

export async function parseFood(input, env) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: PROMPT(input, timestamp) }],
      temperature: 0
    })
  });

  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}
