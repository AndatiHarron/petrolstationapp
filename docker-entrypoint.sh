#!/usr/bin/env sh
set -e

# Most container hosts inject the port to bind on; fall back to 80 locally.
PORT="${PORT:-80}"

echo "==> Petrol Integrity System: starting (env=${APP_ENV:-production})"

# Fail fast and loudly rather than booting a broken app. Laravel would otherwise
# throw a decryption error on the first request, which is far harder to diagnose.
if [ -z "${APP_KEY}" ]; then
  echo "FATAL: APP_KEY is not set. Generate one with 'php artisan key:generate --show'" >&2
  echo "       and set it in the host's environment variables." >&2
  exit 1
fi

echo "==> Running migrations"
php artisan migrate --force

# Rebuild caches from the environment that is actually present at runtime.
# Baking these into the image would freeze build-time config into the container.
echo "==> Caching configuration, routes, views and events"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Only meaningful on the local disk driver. With FILESYSTEM_DISK=s3 evidence
# photos are served from object storage and this is a harmless no-op.
if [ "${FILESYSTEM_DISK:-local}" = "local" ] || [ "${FILESYSTEM_DISK}" = "public" ]; then
  echo "==> Linking storage"
  php artisan storage:link || true
  echo "WARNING: FILESYSTEM_DISK is '${FILESYSTEM_DISK:-local}'. On an ephemeral" >&2
  echo "         container filesystem, uploaded meter evidence is lost on every" >&2
  echo "         redeploy. Set FILESYSTEM_DISK=s3 for production." >&2
fi

echo "==> Serving on 0.0.0.0:${PORT}"
exec php artisan serve --host=0.0.0.0 --port="${PORT}"
