# php:8.5.1-fpm was never published — the build failed at this line with
# "manifest unknown". The 8.5 tag tracks the current patch release, so security
# fixes arrive with a rebuild rather than needing this line edited.
FROM php:8.5-fpm

# 1. System dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. PHP extensions
RUN docker-php-ext-configure intl \
    && docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip intl

# 3. Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# 4. Install dependencies first, so a code-only change doesn't re-resolve packages.
#    Scripts are skipped here because artisan needs the full source tree.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# 5. Application source
COPY . /var/www

RUN composer dump-autoload --no-dev --optimize --classmap-authoritative

# 6. Permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# 7. Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

# Hosting platforms health-check GET /up, which bootstrap/app.php already serves.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-80}/up" || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
