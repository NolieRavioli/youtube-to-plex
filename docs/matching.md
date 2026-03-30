---
title: Track Matching
nav_order: 5
---

# Track Matching

The app tries to match YouTube Music tracks to Plex as accurately as possible using multiple search approaches. When a song still misses, the analyzer and missing-track exports make the failure explicit.

---

## How Matching Works

The app uses multiple search strategies to find songs in Plex:

- Artist and track name matching
- Album cross-referencing
- Fuzzy matching for remixes, live versions, and radio edits
- Multiple search approaches with customizable settings

When a song is found but is not a perfect match, the UI shows a warning indicator.

---

## Analyzing Unmatched Tracks

When a song is not getting matched, use the analyzer in the Advanced tab.

![Track Analyzer](assets/images/track_analyzer.jpg)

This shows how the source track was normalized and why Plex matching did or did not succeed.

---

## Missing Songs

You can view all songs that could not be matched and:

- Download a text file containing the source links
- Match them with Tidal
- Send missing albums to [Lidarr](integrations/lidarr)
- Search via [SLSKD](integrations/slskd)

---

## YouTube Music Metadata Notes

YouTube Music data can be noisier than album-catalog metadata. Playlist entries may come from videos, uploads, or alternate releases with inconsistent titles.

The current pipeline normalizes:

- artist names
- track titles
- album names when available
- durations when YouTube Music exposes them

{: .note }
Video-aware matching improvements and richer MusicBrainz-assisted reconciliation are reasonable follow-up work, but they are not required for the core migration.

---

## Performance and Caching

Most API requests to Plex and Tidal take time, so data is cached heavily.

### How Caching Works

- When a song is matched once, it will not be matched again unless you refresh
- Reloading an existing playlist skips already-cached matches
- Requests are made in small batches to keep matching stable
- You can interrupt a run without losing already-saved matches

### Removing Cache

All cached track matches are stored in `track_links.json` in the storage folder.

**Options:**
1. Delete `track_links.json` to remove all cached matches
2. Click the refresh icon on a playlist import to ignore cache for that run

![Clear Cache](assets/images/clear_cache.jpg)
