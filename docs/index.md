---
title: Home
layout: home
nav_order: 1
---

# YouTube Music to Plex

A web application to sync your YouTube Music playlists, liked songs, and saved albums with [Plex](https://plex.tv/). It keeps the Plex matching pipeline, optional downloader integrations, and background sync worker, but the source provider is now YouTube Music only.

![YouTube Music to Plex Overview](assets/images/app_overview.jpg)

---

## Key Features

### YouTube Music Sources
Synchronize the parts of your YouTube Music library that matter:
- Public or private YouTube Music playlists
- YouTube playlists when supported by the service
- Liked songs
- Library albums and connected-user playlists

### Extensive Track Matching
Advanced matching algorithms find your songs across different formats:
- Multiple search strategies with customizable approaches
- Fuzzy matching for remixes, live versions, and noisy video titles
- Real-time match quality indicators

### Automatic Missing Track Workflows
Never lose track of what Plex could not match:
- [Lidarr](integrations/lidarr) integration for album downloads
- [SLSKD](integrations/slskd) integration for peer-to-peer downloads
- [Tidal](integrations/tidal) matching for alternative availability checks

### Background Sync
Keep saved items in sync with Plex:
- Scheduled synchronization with configurable intervals
- Multiple Google account support
- Cached matching for faster repeat syncs

---

## Getting Started

1. [Install](installation) the application with Docker
2. Follow the [Quick Start](quick-start) guide
3. [Configure Google OAuth](youtube-music/) for YouTube Music access

---

## Current Scope

This migration focuses on explicit playlist, liked-song, and album imports.

**The current direction:**
- YouTube Music is the only source provider
- The Python service owns YouTube Music loading through `ytmusicapi`
- The Plex-side matching pipeline stays reusable
- Recent-playback context discovery is intentionally not part of phase 1
