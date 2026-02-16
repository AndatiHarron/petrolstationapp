#!/bin/bash
set -e  # Exit on error

# Start Nightwatch agent in background
php artisan nightwatch:agent --listen-on=0.0.0.0:2407 --verbose &

AGENT_PID=$!

# Wait briefly for agent
sleep 2

# Start web server (use heroku-php-apache2 for prod)
vendor/bin/heroku-php-apache2 public/

# Kill agent on shutdown
kill $AGENT_PID
