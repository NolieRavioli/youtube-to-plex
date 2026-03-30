---
title: User Integration
parent: YouTube Music Setup
nav_order: 3
---

# YouTube Music User Integration

In the Users section you can connect one or more Google accounts that have access to YouTube Music. This is required for private playlists, liked songs, and library albums.

---

## Features

When you connect a user, you can:

- Browse that user's library playlists
- Browse that user's library albums
- Import liked songs
- Use those items during scheduled sync

---

## Adding Users

1. Open the Users page in the app
2. Click **Connect YouTube Music Account**
3. Sign in with Google
4. Approve the requested access

---

## Multiple Users

You can connect multiple Google accounts if you want to pull items from different YouTube Music libraries.

{: .important }
If Google keeps reusing the same session, connect the extra user from a private browser window.

---

## Security

Connected-user credentials are stored in `ytmusic_users.json` inside `/app/config`.

Sensitive token data is encrypted with the key you provide:

```sh
-e ENCRYPTION_KEY=your_encryption_key_here
```

Generate a secure key with:

```bash
openssl rand -hex 32
```

Best practices:

- Protect the mounted config directory
- Use a strong, unique encryption key
- Keep the key backed up if you want to preserve existing tokens
