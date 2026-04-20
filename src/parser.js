// AI food parser — uses AWS Bedrock (Claude) to extract food items from natural language

import { signRequest } from './aws.js';

export const PROMPT = (input, timestamp) => `Extract food items from this log. For each item return JSON with these exact keys: food (string), qty (string), calories (number), protein_g (number), fat_g (number), carbs_g (number), meal (string).
All numeric values MUST be numbers, not null or strings.
Meal must be one of: breakfast, lunch, dinner, snack (lowercase).
If multiple meals are mentioned (e.g. "X for breakfast and Y for lunch"), assign each food to its correct meal.
If meal type is mentioned, use it. If not, infer from time: before 11am=breakfast, 11am-3pm=lunch, 3-6pm=snack, after 6pm=dinner.
Current time: ${timestamp}
Return ONLY a JSON array, no other text.

Input: "${input}"`;

export async function parseFood(input, env) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{ role: 'user', content: PROMPT(input, timestamp) }]
  });

  const url = `https://bedrock-runtime.${env.AWS_REGION}.amazonaws.com/model/${env.BEDROCK_MODEL}/invoke`;
  const headers = await signRequest(url, 'POST', body, env);
  const res = await fetch(url, { method: 'POST', headers, body });

  if (!res.ok) throw new Error(`Bedrock: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return JSON.parse(data.content[0].text);
}
