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

# Roles and permissions are not optional data — no account can be an admin, a
# manager or an owner without them, so a database that has them missing is a
# database nobody can log in to. The seeder is written to be safe to run again,
# so this runs on every boot rather than being a step someone has to remember.
echo "==> Seeding roles and permissions"
php artisan db:seed --class=RolesAndPermissionsSeeder --force

# The first owner, so a fresh deployment is reachable. Skipped unless both are
# set, and the seeder never changes the password of an account that already
# exists — so a redeploy cannot undo a password you have since changed.
if [ -n "${SUPER_ADMIN_EMAIL}" ] && [ -n "${SUPER_ADMIN_PASSWORD}" ]; then
  echo "==> Ensuring the platform owner account exists"
  php artisan db:seed --class=SuperAdminSeeder --force
else
  echo "NOTE: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set, so no owner" >&2
  echo "      account is created. Set both to be able to sign in." >&2
fi

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
