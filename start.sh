#!/bin/bash
set -e  # Exit on any error

# Use Railway's PORT or default to 8000
export PORT=${PORT:-8000}
export HOST=0.0.0.0

# Start Nightwatch agent in background
php artisan nightwatch:agent --listen-on=0.0.0.0:2407 --verbose &
AGENT_PID=$!

echo "Nightwatch agent PID: $AGENT_PID"
echo "Starting web server on $HOST:$PORT (public) and Nightwatch on :2407 (internal)"

# Wait for agent to bind
sleep 3

# Use PHP built-in server (works everywhere, no extra deps)
php artisan serve --host=$HOST --port=$PORT

# Cleanup on exit
trap "kill $AGENT_PID 2>/dev/null || true" EXIT
