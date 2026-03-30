---
title: Integrations
nav_order: 7
has_children: true
---

# Integrations

YouTube Music to Plex supports several optional integrations to help you download missing tracks and publish categorized items.

---

## Available Integrations

| Integration | Purpose |
|-------------|---------|
| [Lidarr](lidarr) | Automatically download complete albums |
| [SLSKD](slskd) | Peer-to-peer downloads from Soulseek |
| [Tidal](tidal) | Find and compare tracks on Tidal |
| [MQTT / Home Assistant](mqtt) | Publish categorized playlists and albums |

---

## Overview

### Lidarr

[Lidarr](https://github.com/Lidarr/Lidarr) is useful when a missing playlist track belongs to an album you want added to your library automatically.

### SLSKD

[SLSKD](https://github.com/slskd/slskd) can search and download individual missing tracks, but peer-to-peer searches are slower than direct API lookups.

### Tidal

Tidal matching helps verify whether a missing song exists on another catalog and generates export files you can use elsewhere.

### MQTT / Home Assistant

MQTT publishing exposes labeled playlists and albums to Home Assistant for automation-driven playback.
