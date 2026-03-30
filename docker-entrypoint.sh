#!/bin/bash
set -e

echo "YouTube Music to Plex starting..."
echo "================================="

if [ ! -w /app/config ]; then
    echo "Warning: /app/config is not writable. Attempting to fix permissions..."
    chmod 755 /app/config || true
fi

export PORT="${PORT:-9030}"

echo "Web UI Port: $PORT"
echo "Config Directory: /app/config"

if [ -n "$GOOGLE_OAUTH_CLIENT_ID" ]; then
    echo "Google OAuth configured"
fi

if [ -n "$TIDAL_API_CLIENT_ID" ]; then
    echo "Tidal API configured"
fi

echo "Starting services..."
exec "$@"
