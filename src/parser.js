// AI food parser — uses AWS Bedrock (Claude) to extract food items from natural language

import { signRequest } from './aws.js';
import { FOODS } from './foods.js';

export const PROMPT = (input, timestamp, todayDate) => `Extract food items from this log. For each item return JSON with these exact keys: food (string), qty (string), calories (number), protein_g (number), fat_g (number), carbs_g (number), meal (string), date (string YYYY-MM-DD).
All numeric values MUST be numbers, not null or strings.
Meal must be one of: breakfast, lunch, dinner, snack (lowercase).
If multiple meals are mentioned (e.g. "X for breakfast and Y for lunch"), assign each food to its correct meal.
If meal type is mentioned, use it. If not, infer from time: before 11am=breakfast, 11am-3pm=lunch, 3-6pm=snack, after 6pm=dinner.

DATE RULES:
- Today is ${todayDate} (${timestamp}).
- If no date is mentioned, use today: ${todayDate}
- "yesterday" = one day before today
- "day before yesterday" = two days before today
- Weekday names (e.g. "monday", "last tuesday") = most recent past occurrence of that day
- Explicit dates like "april 20" or "20th april" = resolve to YYYY-MM-DD
- Always return date in YYYY-MM-DD format.

Current time: ${timestamp}
Return ONLY a JSON array, no other text.

Input: "${input}"`;

// Match foods from lookup table, return { known: [...], unknownInput: "..." }
export function matchKnownFoods(input) {
  const known = [];
  let remaining = input.toLowerCase();

  for (const [key, val] of Object.entries(FOODS)) {
    // Match patterns like "2 eggs", "1 banana", "eggs", etc.
    const regex = new RegExp(`(\\d+)?\\s*${key}s?\\b`, 'i');
    const m = remaining.match(regex);
    if (m) {
      const multiplier = parseInt(m[1]) || 1;
      known.push({
        food: val.food,
        qty: multiplier === 1 ? val.qty : `${multiplier} × ${val.qty}`,
        calories: val.calories * multiplier,
        protein_g: val.protein_g * multiplier,
        fat_g: val.fat_g * multiplier,
        carbs_g: val.carbs_g * multiplier,
      });
      remaining = remaining.replace(m[0], ' ').trim();
    }
  }

  // Clean up remaining text (remove "and", extra spaces, etc.)
  const unknownInput = remaining.replace(/\band\b/g, '').replace(/\s+/g, ' ').trim();
  return { known, unknownInput };
}

export async function parseFood(input, env) {
  const now = new Date();
  const timestamp = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const todayDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const { known, unknownInput } = matchKnownFoods(input);

  // If everything was matched from lookup, we still need AI for meal + date
  const aiInput = known.length && !unknownInput ? input : input;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{ role: 'user', content: PROMPT(aiInput, timestamp, todayDate) }]
  });

  const url = `https://bedrock-runtime.${env.AWS_REGION}.amazonaws.com/model/${env.BEDROCK_MODEL}/invoke`;
  const headers = await signRequest(url, 'POST', body, env);
  const res = await fetch(url, { method: 'POST', headers, body });

  if (!res.ok) throw new Error(`Bedrock: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const aiResults = JSON.parse(data.content[0].text);

  // Override AI values with lookup values for known foods
  if (known.length) {
    for (const item of aiResults) {
      const match = known.find(k => k.food.toLowerCase() === item.food.toLowerCase());
      if (match) Object.assign(item, match);
    }
  }

  return aiResults;
}
