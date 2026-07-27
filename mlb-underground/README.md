# MLB Underground — Next.js

The journey to here has been a wild one. When I first started to become frustrated with the UI of MLB.tv and MLB.com in general I had noticed already that some sites were pirating MLB streams and running them in their own windows for everyone. I was looking to do that with my own site using my own paid subscription. I eventually found a python based app called mlbv that let folks watch MLB.tv streams on VLC or whatever player they have installed on their computer. This taught me a lot about how MLB's authentication process worked and how to get the cherished stream URLs. 

Things I had to figure out to get this to work:

1. How m3u8 manifests work for HLS streaming in a video player
2. How to create the MLB authentication flow
3. How to access the MLB streaming URLs. 
4. How to make them play correctly on my application

This took some time but I eventually got it working. The front end was React and the backend was PHP.

Then I switched jobs. To get up to speed on Angular at the new job I ported the react front end to Angular and fixed a lot of the bugs I'd been working on over time in that setup. The backend eventually became Ruby on Rails and it let me scrap a good chunk of the PHP since Rails does a lot of lifting for you with less code.

Then over time things started to change on the MLB side. MLB changed their authentication completely. MLB also changed their streaming service. Each time this required me to deconstruct each of their processes on their site so that my site could do it too. 

Then they put CORs restrictions in place. Eventually my site had to move to the deep web without a real domain pointing to it so that I could use a faked MILB.com domain that would avoid CORs errors. Then they stopped letting me get my authetication tokens from the server side. 

I rebuilt the front end again using react and it logged in from the front end to simulate MLB login. 

Then I got tired of having it split between front end and backend. I told Claude to help me port it all to Next.js and here we are. A single application still running on a fake MILB.com domain.

> **Demo note:** Site login is optional and controlled by the `auth_enabled`
> flag in `config.json` (see [Config](#config)). It is **off by default**, so
> this portfolio demo runs open — no site login required. The MLB.com token
> flow works the same regardless of the flag.

## Status

- **Site login (optional)** — a JSON-config user list (like the old PHP
  `.config`), validated server-side, with an httpOnly session cookie. Turned on
  and off by `auth_enabled` in `config.json`. When off (the default), every page
  and API route is open; when on, the site is gated behind `/login` like the
  React app's private routes.
- **Games view** — a server component fetches today's schedule from the MLB
  Stats API, transforms it, and renders the same cards/styling as the React app.
- **MLB token flow (server-side)** — the MLB Okta interaction-code / PKCE flow
  runs on the server (`lib/mlbAuth.ts`, exposed via `POST /api/mlb/refresh`).
  The thin `MLBContextProvider` (client) pings that route on load and on an
  interval; the server refreshes the MLB token with the config credentials when
  it's stale and returns the `{title,status}` the nav's status dot shows. The
  MLB password and PKCE never touch the browser. This runs whenever the site is
  visible — i.e. always when `auth_enabled` is off, or once signed in when it's
  on. (The old browser-side flow + `/api/config` are deprecated.)
- **Player** — `/player/...` renders a game: the live linescore, a tabbed sidebar
  (Preview / Game / rosters, built from `buildGameData`), and a video.js player.
  The stream URL comes from `/api/media/[mediaId]`, a port of the PHP
  `mlb.php`/`stream.php` media-gateway flow (initSession → initPlaybackSession)
  using the stored MLB token. The "mirror" segment proxy is not ported — the
  direct HLS URL is returned.
- **Videos** — `/videos/:slug` is a grid of MLB highlight clips for a team, and
  `/video/:keywords/:slug` plays one clip (video.js) with a "more from" sidebar.
  These use MLB's public content GraphQL (`fastball-gateway.mlb.com`, no auth),
  proxied server-side via `/api/videos/search` and `/api/videos/clip`.

Routes:

- `/login` — sign in (only reachable when `auth_enabled` is true; otherwise it redirects home)
- `/` — today's games (US Eastern); open unless `auth_enabled` is true
- `/games/YYYY-MM-DD` — games for a specific date
- `/player/:gameId/:feedType/:mediaId` — game view + video player
- `/videos/:slug` — highlight-clip grid for a team
- `/video/:keywords/:slug` — play a clip + related sidebar
- `/api/mlb/refresh` — server-side MLB token refresh (returns status)
- `/api/media/:mediaId` — resolves the HLS stream URL
- `/api/videos/search`, `/api/videos/clip` — MLB content GraphQL proxy
- `/api/config`, `/api/auth` — deprecated (old browser-side flow)

### The MLB token flow

The Okta calls now run **server-to-server** from `ids.mlb.com`, so there's no
browser CORS to satisfy — the site no longer has to be served from an mlb-family
origin for the token flow to work. The server sends `Origin`/`Referer`/UA
headers that mimic the real mlb.com login. Set `mlb_username` / `mlb_password`
in `config.json` for it to run. (Whether MLB accepts the server-side requests is
still being validated — if it doesn't, the status dot goes red and the previous
browser-side approach is in git history.)

## Config

Config lives in `config.json` at the project root (git-ignored). Copy the
template and fill it in:

```bash
cp config.example.json config.json
```

Fields:

- `auth_enabled` *(boolean, default `false`)* — whether the **site itself**
  requires a login. Off by default, so the app is open. Set to `true` to gate
  every page/route behind `/login` and the `users` list below. Does not affect
  the MLB.com token flow.
- `users` — the site login accounts (only used when `auth_enabled` is `true`).
- `mlb_username` / `mlb_password` — the MLB.com credentials used for the
  server-side token flow.
- `tmp_dir` — where the server caches the MLB token bundle and resolved streams.

Site-login passwords are stored hashed with the same scheme as the PHP app —
`sha1('salty-salt' . sha1(plaintext))` — so you can paste your existing
`.config` hashes directly. To generate a new hash:

```bash
npm run hash -- yourPasswordHere
```

When `auth_enabled` is `true`, set `AUTH_SECRET` in the environment to sign
session cookies (any random string). Without it, a known insecure dev default is
used.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
```

## Layout

- `app/` — routes, layout, components (App Router)
- `app/actions/auth.ts` — login/logout server actions
- `app/login/` — login page + form (used when `auth_enabled` is true)
- `app/*.scss` — global styles ported from the React app
- `lib/config.ts` — reads `config.json`
- `lib/auth.ts` — the `auth_enabled` flag, password hashing, credential check,
  session cookie (jose), and the `isAuthorized()` gate helper
- `lib/stats.ts` — schedule → `Game[]` transform (ported from the React app)
- `lib/types.ts` — the types that transform needs

## Server setup

### Hetzner

Create a server using Ubuntu out of Singapore which lets us avoid blackouts as much as possible. First Login as root to new server.

```bash
ssh root@x.xxx.xxx.xxx
```

Create a new deploy user and then log out and log back in as deploy

```bash
adduser deploy
usermod -aG sudo deploy
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw enable
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### Logged in as deploy user

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx
sudo apt-get install -y certbot python3-certbot-nginx
node -v   # should be v20.x
```

### Get code from repo first by setting up an ssh key for Github and then cloning

```bash
ssh-keygen -t ed25519
git clone git@github.com:ozarkwebdevelopers/mlb-underground.git
cd /home/mlb-underground/nextjs
npm ci
```

### Setup config file with your MLB credentials (and, if you want site login, a user + AUTH_SECRET)

```bash
cp config.example.json config.json
# For an open site, just fill in mlb_username / mlb_password and leave auth_enabled false.
# To require site login, set auth_enabled true, add a user hash, and set AUTH_SECRET:
npm run hash -- 'your-real-password'   # copy the printed hash into config.json
vi config.json
echo "AUTH_SECRET=$(openssl rand -base64 32)" > .env.production.local
echo "NODE_ENV=production" >> .env.production.local
npm run build
```

### Create service file

```bash
vi /etc/systemd/system/mlbu.service
```
```bash
[Unit]
Description=MLB Underground (Next.js)
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/mlb-underground/nextjs
EnvironmentFile=/home/deploy/mlb-underground/nextjs/.env.production.local
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mlbu
systemctl status mlbu          # should be active (running)
curl -I http://127.0.0.1:3000  # should return HTTP headers
```

### Create self signed keys so the HTTPS mostly works

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048   -keyout /etc/ssl/private/nginx-selfsigned.key   -out /etc/ssl/certs/nginx-selfsigned.crt
```

### Create nginx site file that will use ssl and proxy to the 3000 server

```bash
vi /etc/nginx/sites-available/mlbu:
```
```bash
server {
    listen 80;
    server_name mlbu.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name mlbu.example.com;

    ssl_certificate     /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/mlbu /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Adjusting your hosts file

This is not a public site because of CORs issues so we will be using a faked version of https://www.milb.com. This will require editing your hosts file on OSX or Windows.

```bash
x.xxx.xxx.xxx  www.milb.com
```

### Deployment after changes

```bash
cd nextjs
git pull
npm run build
sudo systemctl restart mlbu
```
