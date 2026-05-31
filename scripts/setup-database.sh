#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${ROARK_DB_NAME:-roark_system}"
APP_USER="${ROARK_DB_USER:-roark}"
APP_PASSWORD="${ROARK_DB_PASSWORD:-}"
ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"
HOST="${POSTGRES_HOST:-localhost}"
PORT="${POSTGRES_PORT:-5432}"

if [[ -z "$APP_PASSWORD" ]]; then
  echo "ROARK_DB_PASSWORD is required."
  echo "Example: ROARK_DB_PASSWORD=\"choose-a-local-password\" npm run db:setup"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql was not found."
  echo "Install the PostgreSQL client first:"
  echo "  Ubuntu/WSL: sudo apt update && sudo apt install postgresql-client"
  echo "  Windows: run this script from Git Bash/WSL after adding PostgreSQL bin to PATH, or use psql from PowerShell."
  exit 1
fi

if ! psql --version >/dev/null 2>&1; then
  echo "psql is present, but no PostgreSQL client version is installed."
  echo "Install the client package first:"
  echo "  sudo apt update && sudo apt install postgresql-client"
  echo "For PostgreSQL 18 specifically, install postgresql-client-18 if available from your package source."
  exit 1
fi

echo "Setting up PostgreSQL database '$DB_NAME' with owner '$APP_USER'."

ROLE_EXISTS="$(
  psql \
    --host "$HOST" \
    --port "$PORT" \
    --username "$ADMIN_USER" \
    --dbname postgres \
    --set app_user="$APP_USER" \
    --tuples-only \
    --no-align \
    --command "SELECT 1 FROM pg_roles WHERE rolname = :'app_user';"
)"

if [[ "$ROLE_EXISTS" == "1" ]]; then
  psql \
    --host "$HOST" \
    --port "$PORT" \
    --username "$ADMIN_USER" \
    --dbname postgres \
    --set app_user="$APP_USER" \
    --set app_password="$APP_PASSWORD" \
    --command "ALTER ROLE :\"app_user\" WITH LOGIN CREATEDB PASSWORD :'app_password';"
else
  psql \
    --host "$HOST" \
    --port "$PORT" \
    --username "$ADMIN_USER" \
    --dbname postgres \
    --set app_user="$APP_USER" \
    --set app_password="$APP_PASSWORD" \
    --command "CREATE ROLE :\"app_user\" WITH LOGIN CREATEDB PASSWORD :'app_password';"
fi

DB_EXISTS="$(
  psql \
    --host "$HOST" \
    --port "$PORT" \
    --username "$ADMIN_USER" \
    --dbname postgres \
    --set db_name="$DB_NAME" \
    --tuples-only \
    --no-align \
    --command "SELECT 1 FROM pg_database WHERE datname = :'db_name';"
)"

if [[ "$DB_EXISTS" == "1" ]]; then
  psql \
    --host "$HOST" \
    --port "$PORT" \
    --username "$ADMIN_USER" \
    --dbname postgres \
    --set db_name="$DB_NAME" \
    --set app_user="$APP_USER" \
    --command "ALTER DATABASE :\"db_name\" OWNER TO :\"app_user\";"
else
  psql \
    --host "$HOST" \
    --port "$PORT" \
    --username "$ADMIN_USER" \
    --dbname postgres \
    --set db_name="$DB_NAME" \
    --set app_user="$APP_USER" \
    --command "CREATE DATABASE :\"db_name\" OWNER :\"app_user\";"
fi

psql \
  --host "$HOST" \
  --port "$PORT" \
  --username "$ADMIN_USER" \
  --dbname "$DB_NAME" \
  --set app_user="$APP_USER" \
  --command "ALTER SCHEMA public OWNER TO :\"app_user\";"

psql \
  --host "$HOST" \
  --port "$PORT" \
  --username "$ADMIN_USER" \
  --dbname "$DB_NAME" \
  --set app_user="$APP_USER" \
  --command "GRANT ALL ON SCHEMA public TO :\"app_user\";"

echo "Database setup complete."
echo "Use this DATABASE_URL in apps/api/.env:"
echo "postgresql://${APP_USER}:<your-password>@${HOST}:${PORT}/${DB_NAME}?schema=public"
