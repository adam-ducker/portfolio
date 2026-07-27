# MLB Underground — Next.js

A simple to use React / Next.js based website for playing MLB.tv games. Playing games will require you to put your MLB login info into the config.json file. 

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
