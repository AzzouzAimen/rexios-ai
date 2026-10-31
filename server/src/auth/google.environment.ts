import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

// Match the AI configuration convention: explicit process/server settings win,
// while blank local values can use credentials from the repository-root .env.
export function loadGoogleEnvironment() {
  let environment: Record<string, string>;
  try { environment = parse(readFileSync(resolve(__dirname, '../../../.env'))); }
  catch { return; }
  for (const name of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'APP_PUBLIC_URL']) {
    if (!process.env[name]?.trim() && environment[name]?.trim()) process.env[name] = environment[name].trim();
  }
}
