#!/usr/bin/env python3
"""
YouTube Music service.

Uses the official YouTube Data API v3 for authenticated operations (library
browsing, liked songs) because ytmusicapi's OAuth + WEB_REMIX client has been
broken since August 2025 (see https://github.com/sigma67/ytmusicapi/issues/813).

Non-authenticated operations (public playlists, albums, track metadata) still
use ytmusicapi which works fine without OAuth.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any
from urllib.parse import parse_qs, urlparse

import requests as http_client
from ytmusicapi import YTMusic

logger = logging.getLogger(__name__)

# YouTube Data API v3
YT_DATA_API = "https://www.googleapis.com/youtube/v3"

# YouTube Music InnerTube API
INNERTUBE_API = "https://music.youtube.com/youtubei/v1"

# IOS_MUSIC client — YouTube Music iOS app client.
# Works with OAuth Bearer tokens and supports all FEmusic_* browse IDs.
# (TVHTML5 v7 also accepts OAuth but is a regular-YouTube TV client and
#  does not reliably support YouTube-Music-specific browse IDs.)
IOS_MUSIC_CONTEXT = {
    "client": {
        "clientName": "IOS_MUSIC",
        "clientVersion": "6.42",
        "hl": "en",
        "gl": "US",
    }
}

# User-Agent that matches the IOS_MUSIC client version above.
IOS_MUSIC_UA = "com.google.ios.youtubemusic/6.42.1 (iPhone; iOS 18.0; Scale/3.00)"


class YouTubeMusicService:
    """YouTube Music integration using Data API v3 + ytmusicapi (non-auth)."""

    def __init__(self) -> None:
        self.client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_expires_at(token: dict[str, Any]) -> int:
        """Return expires_at as Unix epoch seconds."""
        raw = int(token.get("expires_at") or 0)
        return raw // 1000 if raw > 1e12 else raw

    def _ensure_fresh_token(self, token: dict[str, Any]) -> str:
        """Return a valid access_token, refreshing if it is about to expire."""
        expires_at = self._normalize_expires_at(token)
        if expires_at and expires_at - int(time.time()) < 60:
            fresh = self._refresh_token(token["refresh_token"])
            token["access_token"] = fresh
        return token.get("access_token", "")

    def _refresh_token(self, refresh_token: str) -> str:
        """Exchange a refresh_token for a new access_token."""
        resp = http_client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        new_token = data.get("access_token")
        if not new_token:
            raise ValueError("Token refresh did not return an access_token.")
        return new_token

    # ------------------------------------------------------------------
    # YouTube Data API v3 helpers
    # ------------------------------------------------------------------

    def _yt_api_get(self, path: str, params: dict[str, str], token: dict[str, Any]) -> dict[str, Any]:
        access_token = self._ensure_fresh_token(token)
        resp = http_client.get(
            f"{YT_DATA_API}/{path}",
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        if not resp.ok:
            try:
                err_msg = resp.json().get("error", {}).get("message", "")
            except Exception:
                err_msg = ""
            raise http_client.exceptions.HTTPError(
                f"YouTube Data API HTTP {resp.status_code}: {err_msg or resp.text[:300]}",
                response=resp,
            )
        return resp.json()

    def _yt_api_get_all_pages(
        self, path: str, base_params: dict[str, str], token: dict[str, Any], max_pages: int = 20
    ) -> list[dict[str, Any]]:
        """Paginate through a YouTube Data API v3 list endpoint."""
        items: list[dict[str, Any]] = []
        page_token: str | None = None
        for _ in range(max_pages):
            params = {**base_params}
            if page_token:
                params["pageToken"] = page_token
            data = self._yt_api_get(path, params, token)
            items.extend(data.get("items") or [])
            page_token = data.get("nextPageToken")
            if not page_token:
                break
        return items

    # ------------------------------------------------------------------
    # InnerTube TVHTML5 (for library albums — Data API has no equivalent)
    # ------------------------------------------------------------------

    def _innertube_browse(self, browse_id: str, token: dict[str, Any]) -> dict[str, Any]:
        access_token = self._ensure_fresh_token(token)
        body = {
            "context": IOS_MUSIC_CONTEXT,
            "browseId": browse_id,
        }
        resp = http_client.post(
            f"{INNERTUBE_API}/browse",
            json=body,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "User-Agent": IOS_MUSIC_UA,
                "X-Goog-Api-Format-Version": "1",
            },
            timeout=30,
        )
        if not resp.ok:
            try:
                err_msg = resp.json().get("error", {}).get("message", "")
            except Exception:
                err_msg = ""
            raise http_client.exceptions.HTTPError(
                f"InnerTube browse HTTP {resp.status_code} for {browse_id}: {err_msg or resp.text[:300]}",
                response=resp,
            )
        return resp.json()

    # ------------------------------------------------------------------
    # Non-auth ytmusicapi client (public content only)
    # ------------------------------------------------------------------

    @staticmethod
    def _public_client() -> YTMusic:
        return YTMusic()

    # ------------------------------------------------------------------
    # Thumbnail helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _pick_image(item: dict[str, Any]) -> str:
        thumbnails = item.get("thumbnails") or item.get("images") or []
        if not thumbnails:
            return ""
        ordered = sorted(
            thumbnails,
            key=lambda entry: (entry.get("width", 0), entry.get("height", 0)),
        )
        return ordered[-1].get("url", "")

    @staticmethod
    def _pick_yt_thumbnail(thumbnails: dict[str, Any]) -> str:
        """Pick best thumbnail from YouTube Data API v3 format."""
        for size in ("high", "medium", "default"):
            thumb = thumbnails.get(size)
            if thumb and thumb.get("url"):
                return thumb["url"]
        return ""

    # ------------------------------------------------------------------
    # InnerTube TVHTML5 response parsing
    # ------------------------------------------------------------------

    def _parse_innertube_library_items(
        self, data: dict[str, Any], item_type: str = "album"
    ) -> list[dict[str, Any]]:
        """Walk InnerTube TVHTML5 browse response to extract library items."""
        results: list[dict[str, Any]] = []
        self._walk_innertube_tree(data, results, item_type)

        # Deduplicate by ID
        seen: set[str] = set()
        deduped: list[dict[str, Any]] = []
        for item in results:
            if item["id"] and item["id"] not in seen:
                seen.add(item["id"])
                deduped.append(item)
        return deduped

    def _walk_innertube_tree(
        self, obj: Any, found: list[dict[str, Any]], item_type: str
    ) -> None:
        """Recursively walk JSON looking for items with browseId / playlistId."""
        if isinstance(obj, dict):
            # Check if this dict looks like a library item
            item = self._try_extract_innertube_item(obj, item_type)
            if item:
                found.append(item)
                return  # Don't recurse into already-extracted items

            for value in obj.values():
                self._walk_innertube_tree(value, found, item_type)
        elif isinstance(obj, list):
            for entry in obj:
                self._walk_innertube_tree(entry, found, item_type)

    def _try_extract_innertube_item(
        self, obj: dict[str, Any], item_type: str
    ) -> dict[str, Any] | None:
        """Try to extract a library item from a renderer dict."""
        # Extract title
        title = self._extract_text(obj.get("title"))
        if not title:
            title = self._extract_text(obj.get("header"))
        if not title:
            return None

        # Extract ID from navigation endpoints
        item_id = None
        nav = obj.get("navigationEndpoint") or {}
        browse_ep = nav.get("browseEndpoint") or {}
        item_id = browse_ep.get("browseId")

        if not item_id:
            # Try watchPlaylistEndpoint for playlists
            watch_ep = nav.get("watchPlaylistEndpoint") or {}
            item_id = watch_ep.get("playlistId")

        if not item_id:
            # Search deeper for browseId in overlay/menu endpoints
            item_id = self._find_browse_id(obj)

        if not item_id:
            return None

        # Skip non-content items (headers, sections)
        if item_id.startswith("FE"):
            return None

        # Extract thumbnail
        image = ""
        thumbnails = obj.get("thumbnail") or obj.get("thumbnailRenderer") or {}
        if isinstance(thumbnails, dict):
            thumb_list = (
                thumbnails.get("thumbnails")
                or thumbnails.get("musicThumbnailRenderer", {}).get("thumbnail", {}).get("thumbnails")
                or []
            )
            if thumb_list and isinstance(thumb_list, list):
                image = thumb_list[-1].get("url", "")

        if item_type == "album":
            return {
                "type": "youtube-music-album",
                "id": item_id,
                "title": title,
                "image": image,
                "tracks": [],
            }
        # For playlists, strip the "VL" browse-endpoint prefix so callers get
        # a plain playlist ID (e.g. PLxxxx instead of VLPLxxxx).
        if item_id.startswith("VL"):
            item_id = item_id[2:]
        return {
            "type": "youtube-music-playlist",
            "id": item_id,
            "title": title,
            "image": image,
            "owner": "YouTube Music",
            "tracks": [],
        }

    @staticmethod
    def _extract_text(obj: Any) -> str:
        """Extract text from various InnerTube text formats."""
        if isinstance(obj, str):
            return obj.strip()
        if isinstance(obj, dict):
            if "simpleText" in obj:
                return obj["simpleText"].strip()
            runs = obj.get("runs")
            if isinstance(runs, list):
                return "".join(r.get("text", "") for r in runs).strip()
        return ""

    @staticmethod
    def _find_browse_id(obj: dict[str, Any]) -> str | None:
        """Search a dict (non-recursively) for a browseId in known locations."""
        for key in ("overlay", "menu", "onTap", "onSelectCommand"):
            child = obj.get(key)
            if not isinstance(child, dict):
                continue
            # Walk one or two levels
            for v in child.values():
                if isinstance(v, dict):
                    bid = v.get("browseEndpoint", {}).get("browseId")
                    if bid:
                        return bid
                    for v2 in v.values():
                        if isinstance(v2, dict):
                            bid = v2.get("browseEndpoint", {}).get("browseId")
                            if bid:
                                return bid
        return None

    @staticmethod
    def _build_track_id(video_id: str | None, title: str, artists: list[str]) -> str:
        if video_id:
            return video_id

        artist = artists[0] if artists else "unknown"
        return f"ytmusic-missing::{title}::{artist}"

    @staticmethod
    def _parse_duration_ms(track: dict[str, Any]) -> int | None:
        duration_seconds = track.get("duration_seconds")
        if isinstance(duration_seconds, str) and duration_seconds.isdigit():
            return int(duration_seconds) * 1000
        if isinstance(duration_seconds, (int, float)):
            return int(duration_seconds * 1000)

        duration_text = track.get("duration") or track.get("length")
        if not isinstance(duration_text, str) or not duration_text:
            return None

        parts = duration_text.split(":")
        if not all(part.isdigit() for part in parts):
            return None

        total_seconds = 0
        for part in parts:
            total_seconds = (total_seconds * 60) + int(part)

        return total_seconds * 1000

    def normalize_track(
        self,
        track: dict[str, Any],
        default_album: str = "",
        default_album_id: str = "unknown",
    ) -> dict[str, Any]:
        artists = [
            artist.get("name", "").strip()
            for artist in (track.get("artists") or [])
            if artist.get("name")
        ]

        album_name = default_album
        album_id = default_album_id
        album = track.get("album")
        if isinstance(album, dict):
            album_name = album.get("name") or default_album
            album_id = album.get("id") or default_album_id
        elif isinstance(album, str) and album:
            album_name = album

        title = track.get("title", "").strip()
        video_id = track.get("videoId")

        return {
            "id": self._build_track_id(video_id, title, artists),
            "title": title,
            "artist": artists[0] if artists else "Unknown",
            "album": album_name,
            "artists": artists or ["Unknown"],
            "album_id": album_id or "unknown",
            "duration_ms": self._parse_duration_ms(track),
        }

    def normalize_playlist(
        self,
        data: dict[str, Any],
        source_kind: str,
        simplified: bool = False,
        user_id: str | None = None,
        user_name: str | None = None,
    ) -> dict[str, Any]:
        playlist_type = "youtube-music-liked" if source_kind == "liked" else "youtube-music-playlist"
        title = data.get("title") or ("Liked Songs" if source_kind == "liked" else "Untitled Playlist")
        owner = (
            (data.get("author") or {}).get("name")
            or user_name
            or "YouTube Music"
        )

        playlist_id = data.get("id") or data.get("playlistId")
        if source_kind == "liked":
            playlist_id = f"liked-{user_id}" if user_id else "liked-songs"

        tracks = []
        if not simplified:
            tracks = [
                self.normalize_track(track)
                for track in (data.get("tracks") or [])
                if track
            ]

        return {
            "type": playlist_type,
            "id": playlist_id,
            "title": title,
            "image": self._pick_image(data),
            "owner": owner,
            "tracks": tracks,
        }

    def normalize_album(self, browse_id: str, data: dict[str, Any], simplified: bool = False) -> dict[str, Any]:
        tracks = []
        if not simplified:
            tracks = [
                self.normalize_track(
                    track,
                    default_album=data.get("title", ""),
                    default_album_id=browse_id,
                )
                for track in (data.get("tracks") or [])
                if track
            ]

        return {
            "type": "youtube-music-album",
            "id": browse_id,
            "title": data.get("title", "Untitled Album"),
            "image": self._pick_image(data),
            "tracks": tracks,
        }

    def resolve_source(
        self,
        source: str,
        token: dict[str, Any] | None = None,
        simplified: bool = False,
        user_id: str | None = None,
        user_name: str | None = None,
    ) -> dict[str, Any]:
        parsed = self.parse_source(source)
        kind = parsed["kind"]

        if kind == "liked":
            if not token:
                raise ValueError("User authentication required for liked songs.")
            return self._resolve_liked_via_data_api(token, simplified, user_id, user_name)

        if kind == "album":
            client = self._public_client()
            data = client.get_album(parsed["id"])
            return self.normalize_album(parsed["id"], data, simplified=simplified)

        if kind == "audio-playlist-album":
            client = self._public_client()
            browse_id = client.get_album_browse_id(parsed["id"])
            if not browse_id:
                raise ValueError("Could not resolve the YouTube Music album browse ID.")
            data = client.get_album(browse_id)
            return self.normalize_album(browse_id, data, simplified=simplified)

        # Playlist — try public ytmusicapi first, fall back to Data API v3
        try:
            client = self._public_client()
            data = client.get_playlist(parsed["id"], limit=None)
            return self.normalize_playlist(data, source_kind="playlist", simplified=simplified)
        except Exception:
            if token:
                return self._resolve_playlist_via_data_api(parsed["id"], token, simplified)
            raise

    def _resolve_liked_via_data_api(
        self,
        token: dict[str, Any],
        simplified: bool,
        user_id: str | None,
        user_name: str | None,
    ) -> dict[str, Any]:
        tracks: list[dict[str, Any]] = []
        if not simplified:
            tracks = self._get_playlist_tracks_via_data_api("LL", token)
        return {
            "type": "youtube-music-liked",
            "id": f"liked-{user_id}" if user_id else "liked-songs",
            "title": "Liked Songs",
            "image": "",
            "owner": user_name or "YouTube Music",
            "tracks": tracks,
        }

    def _resolve_playlist_via_data_api(
        self,
        playlist_id: str,
        token: dict[str, Any],
        simplified: bool,
    ) -> dict[str, Any]:
        items = self._yt_api_get_all_pages(
            "playlists",
            {"id": playlist_id, "part": "snippet,contentDetails", "maxResults": "1"},
            token,
            max_pages=1,
        )
        if not items:
            raise ValueError(f"Playlist not found: {playlist_id}")

        snippet = items[0].get("snippet", {})
        image = self._pick_yt_thumbnail(snippet.get("thumbnails", {}))
        tracks: list[dict[str, Any]] = []
        if not simplified:
            tracks = self._get_playlist_tracks_via_data_api(playlist_id, token)

        return {
            "type": "youtube-music-playlist",
            "id": playlist_id,
            "title": snippet.get("title", "Untitled Playlist"),
            "image": image,
            "owner": snippet.get("channelTitle", "YouTube Music"),
            "tracks": tracks,
        }

    def _get_playlist_tracks_via_data_api(
        self, playlist_id: str, token: dict[str, Any]
    ) -> list[dict[str, Any]]:
        raw_items = self._yt_api_get_all_pages(
            "playlistItems",
            {"playlistId": playlist_id, "part": "snippet,contentDetails", "maxResults": "50"},
            token,
        )
        tracks: list[dict[str, Any]] = []
        for item in raw_items:
            snippet = item.get("snippet", {})
            video_id = snippet.get("resourceId", {}).get("videoId")
            if not video_id:
                continue
            channel = snippet.get("videoOwnerChannelTitle", "Unknown")
            artist = channel.removesuffix(" - Topic")
            tracks.append({
                "id": video_id,
                "title": (snippet.get("title") or "").strip(),
                "artist": artist,
                "album": "",
                "artists": [artist],
                "album_id": "unknown",
                "duration_ms": None,
            })
        return tracks

    # ------------------------------------------------------------------
    # Library browsing (manage-users page)
    # ------------------------------------------------------------------

    def get_library_playlists(self, token: dict[str, Any]) -> list[dict[str, Any]]:
        """List user's YouTube Music playlists via InnerTube IOS_MUSIC browse.

        Uses InnerTube instead of the YouTube Data API v3 so the caller does not
        need to enable the Data API in their Google Cloud project.
        """
        data = self._innertube_browse("FEmusic_liked_playlists", token)
        return self._parse_innertube_library_items(data, item_type="playlist")

    def get_library_albums(self, token: dict[str, Any]) -> list[dict[str, Any]]:
        """List user's saved albums via InnerTube IOS_MUSIC browse."""
        data = self._innertube_browse("FEmusic_liked_albums", token)
        return self._parse_innertube_library_items(data, item_type="album")

    def get_liked_songs_item(
        self,
        token: dict[str, Any],
        user_id: str | None = None,
        user_name: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return a liked-songs placeholder card (no heavy API call needed)."""
        return [
            {
                "type": "youtube-music-liked",
                "id": f"liked-{user_id}" if user_id else "liked-songs",
                "title": "Liked Songs",
                "image": "",
                "owner": user_name or "YouTube Music",
                "tracks": [],
            }
        ]

    def get_track(self, video_id: str, token: dict[str, Any] | None = None) -> dict[str, Any]:
        """Get track metadata via public ytmusicapi (no auth needed)."""
        client = self._public_client()
        watch = client.get_watch_playlist(videoId=video_id, limit=1)
        tracks = watch.get("tracks") or []
        if not tracks:
            raise ValueError(f"Track not found for video ID {video_id}")
        return self.normalize_track(tracks[0])

    @staticmethod
    def parse_source(source: str) -> dict[str, str]:
        normalized = source.strip()
        if not normalized:
            raise ValueError("Source cannot be empty.")

        lowered = normalized.lower()
        if lowered in {"liked", "liked-songs", "liked songs"}:
            return {"kind": "liked"}

        if normalized.startswith("ytmusic:liked:"):
            return {"kind": "liked"}

        if normalized.startswith("ytmusic:playlist:"):
            return {"kind": "playlist", "id": normalized.split(":", 2)[2]}

        if normalized.startswith("ytmusic:album:"):
            return {"kind": "album", "id": normalized.split(":", 2)[2]}

        if normalized.startswith("MPRE"):
            return {"kind": "album", "id": normalized}

        if normalized.startswith("OLAK5"):
            return {"kind": "audio-playlist-album", "id": normalized}

        if normalized.startswith(("PL", "RD", "VL")):
            return {"kind": "playlist", "id": normalized[2:] if normalized.startswith("VL") else normalized}

        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError("Unsupported YouTube Music source. Expected a playlist URL, album URL, or internal ytmusic:* source.")

        host = parsed.netloc.lower()
        if "youtube.com" not in host and "youtu.be" not in host:
            raise ValueError("Unsupported host. Expected a YouTube Music or YouTube URL.")

        if parsed.path == "/playlist":
            playlist_id = parse_qs(parsed.query).get("list", [None])[0]
            if not playlist_id:
                raise ValueError("Playlist URL is missing the list parameter.")

            if playlist_id.startswith("OLAK5"):
                return {"kind": "audio-playlist-album", "id": playlist_id}

            return {"kind": "playlist", "id": playlist_id}

        if parsed.path.startswith("/browse/"):
            browse_id = parsed.path.split("/browse/", 1)[1]
            if browse_id.startswith("MPRE"):
                return {"kind": "album", "id": browse_id}

        raise ValueError("Unsupported YouTube Music URL. Expected a playlist or album URL.")
