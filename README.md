# YouTube Music to Plex

This project syncs YouTube Music playlists, liked songs, and saved albums into Plex. It keeps the existing Plex matching pipeline, optional Tidal/Lidarr/SLSKD integrations, and background sync worker, but the source provider is now YouTube Music only.

## What It Does

- Connect one or more Google accounts with YouTube Music access
- Import YouTube Music playlists, liked songs, and library albums
- Match source tracks against your Plex music library
- Export missing items to Tidal, Lidarr, or SLSKD
- Publish synced state to MQTT for Home Assistant

## Required Credentials

You need a Google OAuth web client, not just a YouTube Data API key.

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `ENCRYPTION_KEY`

The redirect URI must exactly match the value configured in Google Cloud. For local Docker usage, a direct callback to the app is simplest:

```text
http://127.0.0.1:9030/api/youtube-music/token
```

If you access the app remotely through a domain, use your public HTTPS callback instead, for example:

```text
https://music.example.com/api/youtube-music/token
```

## Docker

```bash
docker build -t youtube-to-plex:latest .

docker run -d \
  --name youtube-music-to-plex \
  -p 9030:9030 \
  -v /path/to/config:/app/config \
  -e GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID \
  -e GOOGLE_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET \
  -e GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:9030/api/youtube-music/token \
  -e ENCRYPTION_KEY=YOUR_64_CHAR_HEX_KEY \
  youtube-to-plex:latest
```

Then open `http://localhost:9030`.

If you prefer Docker Compose, a versioned example is included at `docker-compose.example.yml` and uses the same local `youtube-to-plex:latest` image tag.

## Environment

See `apps/web/.env.example` for the current app configuration template.

## Service Layout

- `apps/web`: Next.js UI and API routes
- `apps/sync-worker`: background sync jobs
- `apps/youtube-music-service`: primary YouTube Music service built on `ytmusicapi`

## Current Notes

- User recent-playback auto-discovery is intentionally disabled in the first YouTube Music migration.
- MusicBrainz lookup now falls back to artist and album text matching for provider-neutral source IDs.
- The remaining workspace package names still use a historical monorepo scope, but runtime behavior is YouTube Music only.
