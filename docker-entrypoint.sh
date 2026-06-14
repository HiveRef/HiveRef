#!/bin/sh
set -e

if [ "$RUN_BOOTSTRAP" = "true" ]; then
    # Copy .env if not exists
    if [ ! -f .env ]; then
        echo "Creating .env file from .env.example..."
        cp .env.example .env
    fi

    # Install composer dependencies if vendor doesn't exist
    if [ ! -d vendor ] || [ ! -f vendor/autoload.php ]; then
        echo "Installing Composer dependencies..."
        composer install --no-interaction --optimize-autoloader
    fi

    # Generate app key if empty in .env (requires vendor autoload)
    if [ -f .env ] && ! grep -q "^APP_KEY=.\+" .env; then
        echo "Generating application key..."
        php artisan key:generate --ansi
    fi

    # Ensure SQLite database file exists
    mkdir -p database
    touch database/database.sqlite

    # Run migrations
    echo "Running migrations..."
    php artisan migrate --force --ansi

    # Fix permissions to match the host user (owner of /var/www)
    CURRENT_USER_ID=$(id -u)
    if [ "$CURRENT_USER_ID" = "0" ]; then
        HOST_UID=$(stat -c '%u' /var/www)
        HOST_GID=$(stat -c '%g' /var/www)
        if [ "$HOST_UID" != "0" ]; then
            echo "Fixing file ownership for host user ($HOST_UID:$HOST_GID)..."
            chown -R $HOST_UID:$HOST_GID .env vendor bootstrap/cache storage database/database.sqlite 2>/dev/null || true
        fi
    fi
else
    # We are a sidecar service (like horizon). We wait for vendor/autoload.php to exist.
    if [ ! -f vendor/autoload.php ]; then
        echo "Waiting for vendor/autoload.php to be ready..."
        while [ ! -f vendor/autoload.php ]; do
            sleep 1
        done
        echo "vendor/autoload.php is ready!"
    fi
fi

# Execute the CMD
exec "$@"
