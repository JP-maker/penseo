# Image de DEV : PHP CLI + extension PostgreSQL + Composer.
FROM php:8.4-cli-alpine

COPY --from=ghcr.io/mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000", "--no-reload"]