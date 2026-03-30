---
title: Authentication
parent: YouTube Music Setup
nav_order: 2
---

# Google OAuth Authentication

This app uses Google OAuth with refresh tokens so scheduled sync jobs can keep loading YouTube Music on behalf of connected users.

---

## Recommended Local Setup

Use a direct callback to the app:

```text
http://127.0.0.1:9030/api/youtube-music/token
```

If you connect to the app remotely through a domain, use your public HTTPS callback instead, for example:

```text
https://music.example.com/api/youtube-music/token
```

Flow summary:

1. The browser is sent to Google's consent screen
2. Google redirects back to `/api/youtube-music/token`
3. The server exchanges the code for tokens
4. The encrypted refresh token is stored locally for future sync jobs

---

## Configuration

### Step 1: Set the Redirect URI

```sh
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:9030/api/youtube-music/token
```

For remote access through a domain, use:

```sh
GOOGLE_OAUTH_REDIRECT_URI=https://music.example.com/api/youtube-music/token
```

### Step 2: Register the Same URI in Google Cloud

Add exactly the same URI to your OAuth client configuration.

{: .important }
Google requires exact redirect URI matching, including scheme, host, port, and path.

---

## Hosted Relay Option

If you need an HTTPS relay page for a LAN deployment, publish the repository's `docs/callback.html` file on an HTTPS origin you control.

That relay page can:

1. Receive the Google auth code
2. Read the return target from the `state`
3. Redirect the browser back to your local app so the server finishes the token exchange

{: .note }
The final code exchange should still happen on the server, not in the relay page.

---

## Troubleshooting

### Invalid Redirect URI

- Check that `GOOGLE_OAUTH_REDIRECT_URI` exactly matches the URI registered in Google Cloud
- Check for trailing slashes or hostname mismatches
- If you access the app remotely, do not leave this set to `127.0.0.1`; use your public domain instead

### No Refresh Token Saved

- Complete the consent flow fully
- Reconnect the user through the app's normal login flow

### Authentication Not Completing

1. Confirm the browser lands on `/api/youtube-music/token`
2. Confirm the OAuth client and environment variable use the same redirect URI
3. Check the app logs for a Google token exchange error

---

## Security Notes

- Refresh tokens are stored locally and encrypted
- The server performs the code exchange directly
- A hosted relay page should only forward the auth code back to your app
