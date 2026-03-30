---
title: Google Cloud Setup
parent: YouTube Music Setup
nav_order: 1
---

# Google Cloud OAuth Setup

To access private YouTube Music data, create a Google OAuth web application. An API key by itself is not enough for liked songs, private playlists, or saved albums.

---

## Create the OAuth Client

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or choose a project
3. Configure the OAuth consent screen
4. Create an **OAuth client ID** for a **Web application**
5. Add your redirect URI exactly as the app will use it

Recommended local redirect URI:

```text
http://127.0.0.1:9030/api/youtube-music/token
```

---

## Environment Variables

Add these to your Docker environment:

```sh
-e GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
-e GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
-e GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:9030/api/youtube-music/token
```

{: .important }
The redirect URI in Google Cloud must exactly match `GOOGLE_OAUTH_REDIRECT_URI`.

---

## Next Step

Continue to [Authentication](authentication) to configure the callback flow.
