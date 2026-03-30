---
title: SLSKD
parent: Integrations
nav_order: 2
---

# SLSKD Integration

SLSKD integration allows you to search for and download missing tracks from the Soulseek network.

---

## Prerequisites

1. A running [SLSKD](https://github.com/slskd/slskd) instance
2. An SLSKD API key

---

## Setup in SLSKD

Generate an API key:

```bash
openssl rand -base64 48
```

Add it to `slskd.yml`:

```yaml
web:
  authentication:
    api_keys:
      youtube_music_to_plex:
        key: "YOUR_GENERATED_API_KEY"
        role: readwrite
        cidr: "0.0.0.0/0"
```

{: .warning }
Restrict the `cidr` range to your network if possible.

---

## Setup in the App

### Step 1: Add Environment Variable

```sh
-e SLSKD_API_KEY=YOUR_GENERATED_API_KEY
```

### Step 2: Configure the Integration

Navigate to **Advanced > SLSKD Integration** and configure:

| Setting | Description |
|---------|-------------|
| SLSKD URL | Base URL of your SLSKD instance |
| Enable SLSKD Integration | Toggle the feature on |
| Enable Automatic Sync | Search and download during scheduled sync |

---

## Usage

- Use the Missing Tracks dialog to search manually
- Enable automatic synchronization to queue searches during the daily job

{: .important }
Peer-to-peer search is slow compared with Plex or Tidal lookups. Expect roughly tens of seconds per song.
