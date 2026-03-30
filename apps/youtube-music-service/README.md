# YouTube Music Service

This Flask service is the primary YouTube Music integration for the app. It wraps `ytmusicapi` and exposes normalized endpoints that the web app and sync worker use for playlist, album, liked-song, and track loading.

## Endpoints

### `GET /health`

Returns service health.

### `POST /resolve`

Resolve a source into normalized playlist or album data.

Example body:

```json
{
  "source": "https://music.youtube.com/playlist?list=PL...",
  "simplified": true,
  "token": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600,
    "expires_at": 1700000000,
    "token_type": "Bearer",
    "scope": "https://www.googleapis.com/auth/youtube"
  }
}
```

Supported sources:

- `ytmusic:playlist:<id>`
- `ytmusic:album:<id>`
- `ytmusic:liked:<userId>`
- YouTube Music playlist URLs
- YouTube playlist URLs
- YouTube Music album browse URLs

### `POST /library/playlists`

Return the authenticated user's library playlists.

### `POST /library/albums`

Return the authenticated user's library albums.

### `POST /library/liked-songs`

Return the authenticated user's liked songs collection as a selectable saved item.

### `POST /track`

Resolve a single YouTube Music track by video ID.

## Environment

- `PORT`
- `DEBUG`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Authenticated requests require Google OAuth refresh tokens. Public playlist and album resolution can work without a user token.

## Local Development

```bash
cd apps/youtube-music-service
pip install -r requirements.txt
python app.py
```

The service listens on `http://localhost:3020` by default.
