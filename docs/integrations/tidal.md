---
title: Tidal
parent: Integrations
nav_order: 3
---

# Tidal Integration

With Tidal credentials configured, you can match missing songs with Tidal to find alternatives or verify track availability.

---

## Prerequisites

Register at the [Tidal Developer Portal](https://developer.tidal.com/) to get client credentials.

{: .note }
Only client credentials are needed. No user OAuth flow is required.

---

## Configuration

Add these environment variables:

```sh
-e TIDAL_API_CLIENT_ID=YOUR_TIDAL_CLIENT_ID
-e TIDAL_API_CLIENT_SECRET=YOUR_TIDAL_CLIENT_SECRET
```

Or in Docker Compose:

```yaml
environment:
  - TIDAL_API_CLIENT_ID=YOUR_TIDAL_CLIENT_ID
  - TIDAL_API_CLIENT_SECRET=YOUR_TIDAL_CLIENT_SECRET
```

---

## Usage

Once configured, you can:

1. Match missing tracks with Tidal
2. Export Tidal links to text files
3. Compare availability before using another downloader workflow

---

## Missing Files

The sync process generates:

| File | Contents |
|------|----------|
| `missing_tracks_youtube_music.txt` | Source links for unmatched YouTube Music tracks |
| `missing_tracks_tidal.txt` | Tidal links for unmatched tracks |
| `missing_albums_tidal.txt` | Tidal links for unmatched albums |

These files are stored in `/app/config`.
