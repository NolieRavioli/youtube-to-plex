---
title: Synchronization
nav_order: 6
---

# Synchronization

You can automatically synchronize saved YouTube Music playlists and albums with Plex. Enable automatic syncing for a saved item and set the interval in days.

![Sync Playlist](assets/images/sync_playlist.jpg)

{: .warning }
Synchronization can take a long time on large libraries or when download integrations are enabled.

---

## How It Works

The application includes a built-in scheduler with multiple jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| Main sync | Daily at 02:00 | Syncs saved playlists and albums |
| SLSKD sync | Daily at 03:00 | Downloads missing tracks via Soulseek |
| Lidarr sync | Daily at 04:00 | Sends missing albums to Lidarr |
| MQTT publish | Every hour | Publishes categorized items to Home Assistant |

{: .note }
All times are based on your configured timezone (`TZ`) or UTC if not set.

1. Enable automatic syncing for a saved item
2. Set the sync interval in days
3. The scheduler checks daily and syncs only when the interval has passed

---

## What Happens During Synchronization

During synchronization, the app performs the same steps as a manual import:

1. Reload the saved YouTube Music item
2. Match all tracks with Plex
3. Log missing tracks and albums
4. Update the destination Plex playlist when applicable

{: .important }
Manual alternative selections are not preserved. Sync always uses the current best automatic match.

---

## Manual Synchronization

To manually trigger a sync, use these endpoints:

| Endpoint | Description |
|----------|-------------|
| `/api/sync/playlists` | Sync all enabled playlists |
| `/api/sync/albums` | Sync all enabled albums |
| `/api/sync/lidarr` | Sync missing albums to Lidarr |
| `/api/sync/slskd` | Search and download missing tracks via SLSKD |
| `/api/sync/mqtt` | Publish categorized items to MQTT |

Example:

```text
http://[IP-ADDRESS]:9030/api/sync/playlists
```

---

## Logs

The UI exposes log entries for each synchronization, including:

- Duration of each sync
- Error messages
- Missing tracks and albums summaries

---

## Missing Files

Album synchronization updates:

- `missing_albums_youtube_music.txt`
- `missing_albums_tidal.txt`

Track synchronization updates:

- `missing_tracks_youtube_music.txt`
- `missing_tracks_tidal.txt`

These files are stored in `/app/config`.

---

## Current Scope

The YouTube Music migration intentionally focuses on explicit user-selected playlists, liked songs, and saved albums.

{: .note }
Recently played context auto-discovery from the old provider implementation is not part of the current YouTube Music sync flow.
