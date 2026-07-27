import fs from 'fs';
import path from 'path';

// Server-side app config, read from config.json at the project root. This file
// is never bundled to the client. Mirrors the PHP app's `.config` shape:
// a small user list plus the shared MLB credentials. Passwords are stored as
// sha1('salty-salt' . sha1(plaintext)) — see scripts/hash.mjs.
export type ConfigUser = {
  id: string;
  username: string;
  password: string;
};

export type Config = {
  // Site login toggle. When false or omitted (the default), the site itself
  // needs no login — every page and API route is open. The MLB.com token flow
  // is unaffected either way. Set to true to require signing in as one of
  // `users`.
  auth_enabled?: boolean;
  users: ConfigUser[];
  mlb_username: string;
  mlb_password: string;
  tmp_dir: string;
};

export function getConfig(): Config {
  const file = path.join(process.cwd(), 'config.json');
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw) as Config;
}
