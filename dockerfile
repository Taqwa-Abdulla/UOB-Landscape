# Use the official lightweight PHP-Apache image
FROM php:8.2-apache

# Install PostgreSQL, unzip, and git (unzip & git are required by Composer to download packages)
RUN apt-get update && apt-get install -y libpq-dev unzip git \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Install Composer directly into the container from its official image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy all your project files into the web server's public directory
COPY . /var/www/html/

# Run composer install to create the vendor folder on Render's server
# (--no-dev optimizes it for production deployment)
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Tell Apache your default home page route (Updated 'guest' spelling)
RUN echo "DirectoryIndex site/guest/home.html" >> /etc/apache2/apache2.conf

# Expose port 80 so Render can route web traffic to it
EXPOSE 80