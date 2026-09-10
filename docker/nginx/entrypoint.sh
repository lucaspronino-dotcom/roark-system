#!/bin/sh
set -eu

CERT_DIR="/etc/letsencrypt/live/app.roark.uno"
RELOAD_MARKER="/var/www/certbot/.reload-nginx"

if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=app.roark.uno"
fi

(
  LAST_RELOAD=""
  while :; do
    if [ -f "$RELOAD_MARKER" ]; then
      CURRENT_RELOAD="$(cat "$RELOAD_MARKER" 2>/dev/null || true)"
      if [ "$CURRENT_RELOAD" != "$LAST_RELOAD" ]; then
        nginx -s reload || true
        LAST_RELOAD="$CURRENT_RELOAD"
      fi
    fi
    sleep 60
  done
) &
