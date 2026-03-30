---
title: Installation
nav_order: 2
---

# Installation

Build and run the app with Docker. Once it is up, the web UI is available at `http://[ipaddress]:9030`.

---

## Prerequisites

Before you begin, you need:

### 1. Encryption Key

```bash
openssl rand -hex 32
```

### 2. Google OAuth Credentials

Create a Google Cloud OAuth web application. A YouTube Data API key alone is not enough for private playlists, liked songs, or library albums.

Recommended local redirect URI:

```text
http://127.0.0.1:9030/api/youtube-music/token
```

See the [YouTube Music setup](youtube-music/) section for the full OAuth flow.

### 3. Tidal API Credentials (optional)

For matching missing songs with Tidal:
- Register at the [Tidal Developer Portal](https://developer.tidal.com/)
- Only client credentials are needed

### 4. Lidarr API Key (optional)

For automatic album downloads:
- Find it in Lidarr under Settings > General > Security > API Key

### 5. SLSKD API Key (optional)

For peer-to-peer downloads from Soulseek:
- Generate one with `openssl rand -base64 48`

---

## Docker Installation

```sh
docker build -t youtube-music-to-plex .

docker run -d \
    --name=youtube-music-to-plex \
    -p 9030:9030 \
    -v /local/directory:/app/config \
    -e PORT=9030 \
    -e GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID \
    -e GOOGLE_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET \
    -e GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:9030/api/youtube-music/token \
    -e ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY \
    -e PLEX_APP_ID=eXf+f9ktw3CZ8i45OY468WxriOCtoFxuNPzVeDcAwfw= \
    youtube-music-to-plex
```

{: .note }
All persistent data is stored in `/app/config`.

### Optional Environment Variables

```sh
-e TIDAL_API_CLIENT_ID=YOUR_TIDAL_CLIENT_ID \
-e TIDAL_API_CLIENT_SECRET=YOUR_TIDAL_CLIENT_SECRET \
-e LIDARR_API_KEY=YOUR_LIDARR_API_KEY \
-e SLSKD_API_KEY=YOUR_SLSKD_API_KEY \
-e MQTT_BROKER_URL=mqtt://YOUR_BROKER:1883
```

---

## Docker Compose / Portainer

```yaml
services:
  youtube-music-to-plex:
    container_name: youtube-music-to-plex
    restart: unless-stopped
    build: .
    ports:
      - "9030:9030"
    volumes:
      - /local/directory:/app/config
    environment:
      - PORT=9030
      - GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID
      - GOOGLE_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET
      - GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:9030/api/youtube-music/token
      - ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY
      - PLEX_APP_ID=eXf+f9ktw3CZ8i45OY468WxriOCtoFxuNPzVeDcAwfw=
```

---

## Redirect URI Notes

Google requires exact redirect URI matching. The simplest setup is a direct loopback callback:

```text
http://127.0.0.1:9030/api/youtube-music/token
```

If you need a relay page for a LAN deployment, publish the repository's `docs/callback.html` file on an HTTPS origin you control and register that exact URL in Google Cloud.
