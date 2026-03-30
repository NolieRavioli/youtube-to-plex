#!/usr/bin/env python3
"""
YouTube Music service backed by ytmusicapi.
"""

from __future__ import annotations

import logging
import os
from typing import Any
from urllib.parse import parse_qs, urlparse

from ytmusicapi import OAuthCredentials, YTMusic
from ytmusicapi.constants import OAUTH_SCOPE

logger = logging.getLogger(__name__)


class YouTubeMusicService:
    """Primary YouTube Music integration for the application."""

    def __init__(self) -> None:
        self.client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()

    @staticmethod
    def _normalize_expires(token: dict[str, Any]) -> tuple[int, int]:
        """Return (expires_at_seconds, expires_in_seconds) from a token dict.

        The JS side may store expires_at in milliseconds (Date.now() based).
        ytmusicapi expects Unix epoch seconds, so convert when needed.
        """
        import time

        raw_at = int(token.get("expires_at") or 0)
        # Heuristic: values above 1e12 are clearly milliseconds
        expires_at = raw_at // 1000 if raw_at > 1e12 else raw_at
        expires_in = max(0, expires_at - int(time.time())) if expires_at else 0
        return expires_at, expires_in

    def create_client(self, token: dict[str, Any] | None = None) -> YTMusic:
        if token and token.get("refresh_token"):
            if not self.client_id or not self.client_secret:
                raise ValueError(
                    "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are required for authenticated YouTube Music requests."
                )

            expires_at, expires_in = self._normalize_expires(token)

            oauth_token = {
                "access_token": token.get("access_token", ""),
                "refresh_token": token["refresh_token"],
                "expires_in": expires_in,
                "expires_at": expires_at,
                "token_type": token.get("token_type") or "Bearer",
                "scope": token.get("scope") or OAUTH_SCOPE,
            }

            return YTMusic(
                oauth_token,
                oauth_credentials=OAuthCredentials(self.client_id, self.client_secret),
            )

        return YTMusic()

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
        client = self.create_client(token)

        kind = parsed["kind"]
        if kind == "liked":
            data = client.get_playlist("LM", limit=None)
            return self.normalize_playlist(
                data,
                source_kind="liked",
                simplified=simplified,
                user_id=user_id,
                user_name=user_name,
            )

        if kind == "album":
            data = client.get_album(parsed["id"])
            return self.normalize_album(parsed["id"], data, simplified=simplified)

        if kind == "audio-playlist-album":
            browse_id = client.get_album_browse_id(parsed["id"])
            if not browse_id:
                raise ValueError("Could not resolve the YouTube Music album browse ID.")

            data = client.get_album(browse_id)
            return self.normalize_album(browse_id, data, simplified=simplified)

        data = client.get_playlist(parsed["id"], limit=None)
        return self.normalize_playlist(data, source_kind="playlist", simplified=simplified)

    def get_library_playlists(self, token: dict[str, Any]) -> list[dict[str, Any]]:
        client = self.create_client(token)
        playlists = client.get_library_playlists(limit=None) or []

        return [
            {
                "type": "youtube-music-playlist",
                "id": item.get("playlistId"),
                "title": item.get("title", "Untitled Playlist"),
                "image": self._pick_image(item),
                "owner": "YouTube Music",
                "tracks": [],
            }
            for item in playlists
            if item.get("playlistId")
        ]

    def get_library_albums(self, token: dict[str, Any]) -> list[dict[str, Any]]:
        client = self.create_client(token)
        albums = client.get_library_albums(limit=500) or []

        return [
            {
                "type": "youtube-music-album",
                "id": item.get("browseId"),
                "title": item.get("title", "Untitled Album"),
                "image": self._pick_image(item),
                "tracks": [],
            }
            for item in albums
            if item.get("browseId")
        ]

    def get_liked_songs_item(
        self,
        token: dict[str, Any],
        user_id: str | None = None,
        user_name: str | None = None,
    ) -> list[dict[str, Any]]:
        client = self.create_client(token)
        account_info = client.get_account_info()

        liked = {
            "type": "youtube-music-liked",
            "id": f"liked-{user_id}" if user_id else "liked-songs",
            "title": "Liked Songs",
            "image": account_info.get("accountPhotoUrl", ""),
            "owner": user_name or account_info.get("accountName") or "YouTube Music",
            "tracks": [],
        }
        return [liked]

    def get_track(self, video_id: str, token: dict[str, Any] | None = None) -> dict[str, Any]:
        client = self.create_client(token)
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
