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

    # Ensure SQLite database file exists only if using SQLite
    DB_CONN="${DB_CONNECTION:-$(grep -E "^DB_CONNECTION=" .env 2>/dev/null | cut -d= -f2 | tr -d '\r ')}"
    if [ "$DB_CONN" = "sqlite" ] || [ -z "$DB_CONN" ]; then
        echo "SQLite connection detected. Ensuring SQLite database file exists..."
        mkdir -p database
        touch database/database.sqlite
    fi

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
            CHOWN_PATHS=".env vendor bootstrap/cache storage"
            if [ -f database/database.sqlite ]; then
                CHOWN_PATHS="$CHOWN_PATHS database/database.sqlite"
            fi
            chown -R $HOST_UID:$HOST_GID $CHOWN_PATHS 2>/dev/null || true
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
