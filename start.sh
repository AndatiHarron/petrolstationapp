#!/bin/bash
set -e  # Exit on any error

# Ensure PORT is set (Railway provides it, or default to 80)
export PORT=${PORT:-80}

# Start Nightwatch agent in background on fixed internal port
php artisan nightwatch:agent --listen-on=0.0.0.0:2407 --verbose &
AGENT_PID=$!

# Give agent 3 seconds to bind
sleep 3

echo "Starting web server on 0.0.0.0:$PORT (public) and Nightwatch on :2407 (internal)"

# Production web server on $PORT (80), serving from public/
exec vendor/bin/heroku-php-apache2 public/ -p $PORT

# The exec ensures agent is killed when web server stops
trap "kill $AGENT_PID 2>/dev/null || true" EXIT
