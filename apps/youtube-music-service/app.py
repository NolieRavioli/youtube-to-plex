#!/usr/bin/env python3
"""
YouTube Music Flask API Service.
"""

from __future__ import annotations

import logging
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from youtube_music_service import YouTubeMusicService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
service = YouTubeMusicService()


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "youtube-music"}), 200


@app.route("/resolve", methods=["POST"])
def resolve_source():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json() or {}
        source = str(data.get("source", "")).strip()
        if not source:
            return jsonify({"error": "Missing required field: source"}), 400

        resolved = service.resolve_source(
            source=source,
            token=data.get("token"),
            simplified=bool(data.get("simplified", False)),
            user_id=data.get("user_id"),
            user_name=data.get("user_name"),
        )
        return jsonify(resolved), 200
    except ValueError as error:
        logger.warning("Resolve validation error: %s", error)
        return jsonify({"error": str(error)}), 400
    except Exception as error:  # pragma: no cover
        logger.exception("Failed to resolve YouTube Music source")
        return jsonify({"error": str(error)}), 500


@app.route("/library/playlists", methods=["POST"])
def library_playlists():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json() or {}
        token = data.get("token")
        if not token:
            return jsonify({"error": "Missing required field: token"}), 400

        return jsonify(service.get_library_playlists(token)), 200
    except ValueError as error:
        logger.warning("Playlist library validation error: %s", error)
        return jsonify({"error": str(error)}), 400
    except Exception as error:  # pragma: no cover
        logger.exception("Failed to load library playlists")
        return jsonify({"error": str(error)}), 500


@app.route("/library/albums", methods=["POST"])
def library_albums():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json() or {}
        token = data.get("token")
        if not token:
            return jsonify({"error": "Missing required field: token"}), 400

        return jsonify(service.get_library_albums(token)), 200
    except ValueError as error:
        logger.warning("Album library validation error: %s", error)
        return jsonify({"error": str(error)}), 400
    except Exception as error:  # pragma: no cover
        logger.exception("Failed to load library albums")
        return jsonify({"error": str(error)}), 500


@app.route("/library/liked-songs", methods=["POST"])
def liked_songs():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json() or {}
        token = data.get("token")
        if not token:
            return jsonify({"error": "Missing required field: token"}), 400

        return jsonify(
            service.get_liked_songs_item(
                token=token,
                user_id=data.get("user_id"),
                user_name=data.get("user_name"),
            )
        ), 200
    except ValueError as error:
        logger.warning("Liked songs validation error: %s", error)
        return jsonify({"error": str(error)}), 400
    except Exception as error:  # pragma: no cover
        logger.exception("Failed to load liked songs")
        return jsonify({"error": str(error)}), 500


@app.route("/track", methods=["POST"])
def track():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json() or {}
        video_id = str(data.get("video_id", "")).strip()
        if not video_id:
            return jsonify({"error": "Missing required field: video_id"}), 400

        return jsonify(service.get_track(video_id, token=data.get("token"))), 200
    except ValueError as error:
        logger.warning("Track validation error: %s", error)
        return jsonify({"error": str(error)}), 400
    except Exception as error:  # pragma: no cover
        logger.exception("Failed to load track")
        return jsonify({"error": str(error)}), 500


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(_error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3020))
    debug = os.environ.get("DEBUG", "false").lower() == "true"

    logger.info("Starting YouTube Music API on port %s", port)
    app.run(host="0.0.0.0", port=port, debug=debug)
