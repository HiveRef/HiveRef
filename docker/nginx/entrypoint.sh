#!/bin/sh
set -e

# Stale Vite hot file causes 502 when @vite() tries to load from Vite dev server
rm -f /var/www/public/hot

exec "$@"
