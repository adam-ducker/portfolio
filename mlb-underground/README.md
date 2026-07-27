# MLB Underground — Next.js

A simple to use React / Next.js based website for playing MLB.tv games. Playing games will require you to put your MLB login info into the config.json file. 

## Config

Config lives in `config.json` at the project root (git-ignored). Copy the
template and fill it in:

```bash
cp config.example.json config.json
```

There are two types of authentication involved. The first is site wide user auth to protec the app if it is out in the wild. Second is the MLB.com account authentication. This information is stored safely in config and used to generate the streaming URLs for the player.

Fields:

- `auth_enabled` *(boolean, default `false`)* — whether the **site itself**
  requires a login. Off by default, so the app is open. Set to `true` to gate
  every page/route behind `/login` and the `users` list below. Does not affect
  the MLB.com token flow.
- `users` — the site login accounts (only used when `auth_enabled` is `true`).
- `mlb_username` / `mlb_password` — the MLB.com credentials used for the
  server-side token flow.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
```

