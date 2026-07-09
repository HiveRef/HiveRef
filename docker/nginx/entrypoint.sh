#!/bin/sh
set -e

# Generate self-signed SSL cert (Codespaces proxy sends TLS to port 8000)
if [ ! -f /etc/nginx/ssl/self.crt ]; then
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/self.key \
        -out /etc/nginx/ssl/self.crt \
        -subj '/CN=localhost'
fi

# Stale Vite hot file causes 502 when @vite() tries to load from Vite dev server
rm -f /var/www/public/hot

exec "$@"
