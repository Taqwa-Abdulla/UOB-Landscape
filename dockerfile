FROM php:8.2-apache

<<<<<<< HEAD
# Install PostgreSQL extensions
=======
# Install PostgreSQL dependencies and extensions
>>>>>>> c5ccd282ee02468c5a6fed0d51a00e0091f6e65e
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

COPY . /var/www/html/
EXPOSE 80