# Use a stable PHP version (8.5 does not exist yet)
FROM php:8.5.1-fpm

LABEL authors="jjmbe"

# 1. Install system dependencies
# Added libzip-dev and libicu-dev which were causing your build failure
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

# 2. Install PHP extensions
# Configured intl and added 'zip' and 'intl' to the install list
RUN docker-php-ext-configure intl \
    && docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip intl

# 3. Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 4. Set working directory
WORKDIR /var/www

# 5. Copy application files
COPY . /var/www

# 6. Install dependencies
RUN composer install --no-dev --optimize-autoloader

# 7. Set permissions (Added chmod to ensure write access)
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# 8. Expose Port
EXPOSE 80

# 9. Start Application
# Note: For high-traffic production, consider using Nginx+FPM or Octane instead of 'serve'
CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=80
